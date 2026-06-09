// netlify/functions/sync.js
// Runs on schedule (7am UTC daily) + on-demand from admin panel
// Fetches fixtures, standings, odds → writes to Netlify Blobs → generates moments

import { getStore } from '@netlify/blobs'

const FOOTBALL_BASE = 'https://v3.football.api-sports.io'
const ODDS_BASE     = 'https://api.the-odds-api.com/v4'
const WC_LEAGUE     = 1      // API-Football: FIFA World Cup
const WC_SEASON     = 2026

// ─── Banter moment templates ────────────────────────────────────────────────

function generateMoment({ type, team, participant, opponent, score }) {
  const templates = {
    eliminated: [
      `💀 ${team} are OUT. ${participant ? `Absolutely gutting for ${participant} — pour one out.` : 'Someone just had their dreams crushed.'}`,
      `⚰️ RIP ${team}. ${participant ? `${participant} can go home early. Brutal.` : 'Another one bites the dust.'}`,
      `🪦 ${team} eliminated. ${participant ? `${participant} is now just here for the vibes.` : 'The dream is dead.'}`,
    ],
    upset: [
      `😱 UPSET ALERT: ${opponent} just beat ${team}! ${participant ? `${participant} did NOT see that coming.` : 'Nobody saw that coming.'}`,
      `🤯 ${opponent} knocked out ${team}?! ${participant ? `${participant} is fuming.` : 'Chaos in the bracket.'}`,
    ],
    advancing: [
      `🔥 ${team} into the ${score}! ${participant ? `${participant} is BUZZING.` : 'Still alive!'}`,
      `✅ ${team} progress to the ${score}. ${participant ? `Good news for ${participant}.` : ''}`,
    ],
    winner: [
      `🏆 ${team} ARE WORLD CHAMPIONS! ${participant ? `${participant} WINS THE SWEEPSTAKE! 🎉🎉🎉` : 'What a tournament!'}`,
    ],
    goodGame: [
      `⚽ ${team} ${score} ${opponent} — what a game!`,
    ],
  }
  const list = templates[type] || templates.goodGame
  return list[Math.floor(Math.random() * list.length)]
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function footballGet(path, params = {}) {
  const url = new URL(`${FOOTBALL_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY }
  })
  if (!res.ok) throw new Error(`API-Football ${path} → ${res.status}`)
  const data = await res.json()
  return data.response
}

async function oddsGet(path, params = {}) {
  const url = new URL(`${ODDS_BASE}${path}`)
  url.searchParams.set('apiKey', process.env.ODDS_API_KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Odds API ${path} → ${res.status}`)
  return res.json()
}

// ─── Main sync ────────────────────────────────────────────────────────────────

export default async function handler(req) {
  // Auth check for on-demand calls (scheduled calls have no auth header)
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    if (body.password !== process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
  }

  const store = getStore('sweepstake')
  const isLivePoll = req.headers?.get('x-poll-type') === 'live'

  try {
    const now = new Date()
    const log = []

    // ── 1. Fixtures & Results ──────────────────────────────────────────────
    log.push('Fetching fixtures...')
    const fixturesRaw = await footballGet('/fixtures', {
      league: WC_LEAGUE,
      season: WC_SEASON,
    })

    const fixtures = fixturesRaw.map(f => ({
      id:        f.fixture.id,
      date:      f.fixture.date,
      status:    f.fixture.status.short, // NS, 1H, HT, 2H, FT, AET, PEN
      statusLong: f.fixture.status.long,
      homeTeam:  f.teams.home.name,
      awayTeam:  f.teams.away.name,
      homeLogo:  f.teams.home.logo,
      awayLogo:  f.teams.away.logo,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      round:     f.league.round,
      venue:     f.fixture.venue?.name,
    }))

    await store.setJSON('fixtures', { fixtures, updatedAt: now.toISOString() })
    log.push(`Stored ${fixtures.length} fixtures`)

    // ── 2. Group Standings ─────────────────────────────────────────────────
    if (!isLivePoll) {
      log.push('Fetching standings...')
      const standingsRaw = await footballGet('/standings', {
        league: WC_LEAGUE,
        season: WC_SEASON,
      })

      // API returns array of groups
      const groups = {}
      const leagueStandings = standingsRaw?.[0]?.league?.standings || []
      leagueStandings.forEach(group => {
        if (!group.length) return
        const groupName = group[0].group // e.g. "Group A"
        groups[groupName] = group.map(t => ({
          team:   t.team.name,
          logo:   t.team.logo,
          rank:   t.rank,
          pts:    t.points,
          played: t.all.played,
          won:    t.all.win,
          drawn:  t.all.draw,
          lost:   t.all.lose,
          gf:     t.all.goals.for,
          ga:     t.all.goals.against,
          gd:     t.goalsDiff,
          form:   t.form,
        }))
      })

      await store.setJSON('standings', { groups, updatedAt: now.toISOString() })
      log.push(`Stored ${Object.keys(groups).length} groups`)

      // ── 3. Odds ────────────────────────────────────────────────────────────
      log.push('Fetching odds...')
      try {
        const oddsRaw = await oddsGet('/sports/soccer_fifa_world_cup_winner/odds', {
          regions: 'uk',
          markets: 'outrights',
          oddsFormat: 'decimal',
        })

        // Convert decimal odds → implied probability, normalise to 100%
        const outcomes = oddsRaw?.[0]?.bookmakers?.[0]?.markets?.[0]?.outcomes || []
        const raw = {}
        let totalImplied = 0
        outcomes.forEach(o => {
          const implied = 1 / o.price
          raw[o.name] = implied
          totalImplied += implied
        })
        // Normalise
        const odds = {}
        Object.entries(raw).forEach(([team, implied]) => {
          odds[team] = Math.round((implied / totalImplied) * 1000) / 10 // % to 1dp
        })

        await store.setJSON('odds', { odds, updatedAt: now.toISOString() })
        log.push(`Stored odds for ${Object.keys(odds).length} teams`)
      } catch (e) {
        log.push(`Odds fetch failed (non-fatal): ${e.message}`)
      }
    }

    // ── 4. Moments (auto-generated from new results) ────────────────────────
    log.push('Generating moments...')
    const existingMomentsData = await store.get('moments', { type: 'json' }).catch(() => ({ moments: [] }))
    const existingMoments = existingMomentsData?.moments || []
    const seenIds = new Set(existingMoments.map(m => m.sourceId).filter(Boolean))
    const participantsData = await store.get('participants', { type: 'json' }).catch(() => ({ participants: [] }))
    const participants = participantsData?.participants || []

    // Team → participant name lookup
    const teamToParticipant = {}
    participants.forEach(p => {
      if (p.teams?.[0]) teamToParticipant[p.teams[0]] = p.name
      if (p.teams?.[1]) teamToParticipant[p.teams[1]] = p.name
    })

    const newMoments = []
    const finished = fixtures.filter(f => f.status === 'FT' || f.status === 'AET' || f.status === 'PEN')

    finished.forEach(f => {
      const momentId = `result-${f.id}`
      if (seenIds.has(momentId)) return

      const homeWon = f.homeScore > f.awayScore
      const awayWon = f.awayScore > f.homeScore
      const winner  = homeWon ? f.homeTeam : awayWon ? f.awayTeam : null
      const loser   = homeWon ? f.awayTeam : awayWon ? f.homeTeam : null

      // Knockout elimination moment
      if (loser && f.round && !f.round.toLowerCase().includes('group')) {
        newMoments.push({
          id: `${momentId}-elim`,
          sourceId: `${momentId}-elim`,
          type: 'eliminated',
          text: generateMoment({
            type: 'eliminated',
            team: loser,
            participant: teamToParticipant[loser],
          }),
          timestamp: f.date,
          teams: [f.homeTeam, f.awayTeam],
        })
      }

      // Advancing moment
      if (winner && f.round && !f.round.toLowerCase().includes('group')) {
        const stage = f.round.replace('Round of', 'R').replace('Quarter-finals', 'QF').replace('Semi-finals', 'SF').replace('Final', 'the Final')
        newMoments.push({
          id: `${momentId}-adv`,
          sourceId: `${momentId}-adv`,
          type: 'advancing',
          text: generateMoment({
            type: 'advancing',
            team: winner,
            participant: teamToParticipant[winner],
            score: stage,
          }),
          timestamp: f.date,
          teams: [winner],
        })
      }

      // Big scoreline / upset detection (group stage)
      if (f.round?.toLowerCase().includes('group') && f.homeScore !== null) {
        const scoreDiff = Math.abs(f.homeScore - f.awayScore)
        if (scoreDiff >= 3) {
          newMoments.push({
            id: momentId,
            sourceId: momentId,
            type: 'goodGame',
            text: generateMoment({
              type: 'goodGame',
              team: f.homeTeam,
              opponent: f.awayTeam,
              score: `${f.homeScore}–${f.awayScore}`,
            }),
            timestamp: f.date,
            teams: [f.homeTeam, f.awayTeam],
          })
        }
      }
    })

    if (newMoments.length) {
      const allMoments = [...newMoments, ...existingMoments]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50) // keep latest 50
      await store.setJSON('moments', { moments: allMoments, updatedAt: now.toISOString() })
      log.push(`Added ${newMoments.length} new moments`)
    } else {
      log.push('No new moments')
    }

    // ── 5. Check if any games today (for live poll decisions) ───────────────
    const todayStr = now.toISOString().slice(0, 10)
    const gamesToday = fixtures.filter(f => f.date?.startsWith(todayStr))
    const liveOrSoon = gamesToday.filter(f => ['NS','1H','HT','2H','ET','BT','P','INT'].includes(f.status))
    await store.setJSON('meta', {
      lastSync: now.toISOString(),
      hasGamesToday: gamesToday.length > 0,
      hasLiveGames: liveOrSoon.length > 0,
      gamesToday: gamesToday.length,
    })

    return new Response(JSON.stringify({ ok: true, log }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('Sync error:', e)
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
