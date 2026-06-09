// netlify/functions/sync.js
// Runs on schedule (7am UTC daily) + on-demand from admin panel
// Sources:
//   Fixtures + Results  → raw.githubusercontent.com/openfootball/worldcup.json (free, no key)
//   Group Standings     → raw.githubusercontent.com/openfootball/worldcup.json (free, no key)
//   Odds                → the-odds-api.com (free, key required)

import { getStore } from "@netlify/blobs";

const OPENFOOTBALL_BASE =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026";
const ODDS_BASE = "https://api.the-odds-api.com/v4";

// ─── Banter moment templates ──────────────────────────────────────────────────

function generateMoment({ type, team, participant, opponent, score }) {
  const templates = {
    eliminated: [
      `💀 ${team} are OUT. ${participant ? `Absolutely gutting for ${participant} — pour one out.` : "Someone just had their dreams crushed."}`,
      `⚰️ RIP ${team}. ${participant ? `${participant} can go home early. Brutal.` : "Another one bites the dust."}`,
      `🪦 ${team} eliminated. ${participant ? `${participant} is now just here for the vibes.` : "The dream is dead."}`,
      `😬 ${team} bottle it. ${participant ? `${participant} didn't even make it to the good bit. Rough.` : "Gone. Just like that."}`,
    ],
    advancing: [
      `🔥 ${team} through to the ${score}! ${participant ? `${participant} is absolutely buzzing.` : "Still alive!"}`,
      `✅ ${team} progress to the ${score}. ${participant ? `Good times for ${participant}.` : "Keep the dream alive."}`,
      `🚀 ${team} marching on to the ${score}! ${participant ? `${participant} can sleep easy tonight.` : ""}`,
    ],
    winner: [
      `🏆 ${team} ARE WORLD CHAMPIONS! ${participant ? `${participant} WINS THE SWEEPSTAKE! 🎉🎉🎉` : "What a tournament!"}`,
    ],
    goodGame: [
      `⚽ ${team} ${score} ${opponent} — what a game!`,
      `🎉 ${score} — ${team} vs ${opponent}. Scenes.`,
    ],
    upset: [
      `😱 UPSET ALERT: ${opponent} just beat ${team}! ${participant ? `${participant} did NOT see that coming.` : "Nobody saw that coming."}`,
      `🤯 ${opponent} knocked out ${team}?! ${participant ? `${participant} is fuming.` : "Chaos reigns."}`,
    ],
  };
  const list = templates[type] || templates.goodGame;
  return list[Math.floor(Math.random() * list.length)];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} → ${res.status}`);
  return res.json();
}

async function oddsGet(path, params = {}) {
  const url = new URL(`${ODDS_BASE}${path}`);
  url.searchParams.set("apiKey", process.env.ODDS_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Odds API ${path} → ${res.status}`);
  return res.json();
}

// openfootball round name → our status + round label
function parseMatch(m) {
  const hasScore = m.score && m.score.ft && m.score.ft.length === 2;
  const isGroup =
    m.group != null ||
    (m.round && m.round.toLowerCase().startsWith("matchday"));

  // Build a normalised date string (openfootball gives "2026-06-11")
  const date = m.date
    ? `${m.date}T${(m.time || "00:00").replace(/\s.*$/, "")}:00Z`
    : null;

  return {
    id: `${m.date}-${m.team1}-${m.team2}`.replace(/\s+/g, "-"),
    date,
    status: hasScore ? "FT" : "NS",
    homeTeam: m.team1,
    awayTeam: m.team2,
    homeScore: hasScore ? m.score.ft[0] : null,
    awayScore: hasScore ? m.score.ft[1] : null,
    round: isGroup ? (m.group ? `Group ${m.group}` : m.round) : m.round || "",
    venue: m.stadium || "",
    isGroup,
  };
}

// ─── Main sync ────────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body.password !== process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
  }

  const store = getStore("sweepstake");
  const isLivePoll = req.headers?.get("x-poll-type") === "live";

  try {
    const now = new Date();
    const log = [];

    // ── 1. Fixtures ───────────────────────────────────────────────────────────
    log.push("Fetching fixtures...");
    const rawData = await fetchJSON(`${OPENFOOTBALL_BASE}/worldcup.json`);
    const matches = rawData.matches || [];
    const fixtures = matches.map(parseMatch);
    await store.setJSON("fixtures", { fixtures, updatedAt: now.toISOString() });
    log.push(`Stored ${fixtures.length} fixtures`);

    // ── 2. Standings ──────────────────────────────────────────────────────────
    if (!isLivePoll) {
      log.push("Fetching standings...");
      try {
        const groupsRaw = await fetchJSON(
          `${OPENFOOTBALL_BASE}/worldcup.groups.json`,
        );
        const groups = {};

        // openfootball groups format: { "groups": [{ "name": "Group A", "teams": [...] }] }
        // But we can also compute standings from results ourselves as a fallback
        const groupList = groupsRaw.groups || [];

        if (groupList.length) {
          groupList.forEach((g) => {
            const groupName = g.name || `Group ${g.key}`;
            // Compute standings from fixtures we already have
            const groupFixtures = fixtures.filter(
              (f) => f.round === groupName && f.status === "FT",
            );
            const teamStats = {};

            // Seed teams
            (g.teams || []).forEach((t) => {
              teamStats[t] = {
                team: t,
                pts: 0,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                gf: 0,
                ga: 0,
                gd: 0,
                form: "",
              };
            });

            // Calculate from results
            groupFixtures.forEach((f) => {
              const h = teamStats[f.homeTeam];
              const a = teamStats[f.awayTeam];
              if (!h || !a) return;
              h.played++;
              a.played++;
              h.gf += f.homeScore;
              h.ga += f.awayScore;
              a.gf += f.awayScore;
              a.ga += f.homeScore;
              if (f.homeScore > f.awayScore) {
                h.won++;
                h.pts += 3;
                a.lost++;
                h.form += "W";
                a.form += "L";
              } else if (f.homeScore < f.awayScore) {
                a.won++;
                a.pts += 3;
                h.lost++;
                a.form += "W";
                h.form += "L";
              } else {
                h.drawn++;
                h.pts++;
                a.drawn++;
                a.pts++;
                h.form += "D";
                a.form += "D";
              }
            });

            // Sort by pts → gd → gf
            const sorted = Object.values(teamStats)
              .sort(
                (a, b) =>
                  b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf,
              )
              .map((t, i) => ({ ...t, rank: i + 1, gd: t.gf - t.ga }));

            groups[groupName] = sorted;
          });
        }

        await store.setJSON("standings", {
          groups,
          updatedAt: now.toISOString(),
        });
        log.push(`Stored ${Object.keys(groups).length} groups`);
      } catch (e) {
        log.push(`Standings fetch failed (non-fatal): ${e.message}`);
      }

      // ── 3. Odds ─────────────────────────────────────────────────────────────
      log.push("Fetching odds...");
      try {
        const oddsRaw = await oddsGet(
          "/sports/soccer_fifa_world_cup_winner/odds",
          {
            regions: "uk",
            markets: "outrights",
            oddsFormat: "decimal",
          },
        );
        const outcomes =
          oddsRaw?.[0]?.bookmakers?.[0]?.markets?.[0]?.outcomes || [];
        const raw = {};
        let totalImplied = 0;
        outcomes.forEach((o) => {
          const i = 1 / o.price;
          raw[o.name] = i;
          totalImplied += i;
        });
        const odds = {};
        Object.entries(raw).forEach(([t, i]) => {
          odds[t] = Math.round((i / totalImplied) * 1000) / 10;
        });
        await store.setJSON("odds", { odds, updatedAt: now.toISOString() });
        log.push(`Stored odds for ${Object.keys(odds).length} teams`);
      } catch (e) {
        log.push(`Odds fetch failed (non-fatal): ${e.message}`);
      }
    }

    // ── 4. Moments ────────────────────────────────────────────────────────────
    log.push("Generating moments...");
    const existingData = await store
      .get("moments", { type: "json" })
      .catch(() => ({ moments: [] }));
    const participantData = await store
      .get("participants", { type: "json" })
      .catch(() => ({ participants: [] }));
    const existingMoments = existingData?.moments || [];
    const participants = participantData?.participants || [];
    const seenIds = new Set(
      existingMoments.map((m) => m.sourceId).filter(Boolean),
    );

    const teamToParticipant = {};
    participants.forEach((p) => {
      if (p.teams?.[0]) teamToParticipant[p.teams[0]] = p.name;
      if (p.teams?.[1]) teamToParticipant[p.teams[1]] = p.name;
    });

    const newMoments = [];
    fixtures
      .filter((f) => f.status === "FT")
      .forEach((f) => {
        const momentId = `result-${f.id}`;
        if (seenIds.has(momentId)) return;
        const homeWon = f.homeScore > f.awayScore;
        const awayWon = f.awayScore > f.homeScore;
        const winner = homeWon ? f.homeTeam : awayWon ? f.awayTeam : null;
        const loser = homeWon ? f.awayTeam : awayWon ? f.homeTeam : null;
        const isKnockout = !f.isGroup;

        if (isKnockout && loser) {
          newMoments.push({
            id: `${momentId}-elim`,
            sourceId: `${momentId}-elim`,
            type: "eliminated",
            text: generateMoment({
              type: "eliminated",
              team: loser,
              participant: teamToParticipant[loser],
            }),
            timestamp: f.date,
            teams: [loser],
          });
        }
        if (isKnockout && winner) {
          const stageLabel = (f.round || "")
            .replace("Round of", "R")
            .replace("Quarter-finals", "QF")
            .replace("Semi-finals", "SF")
            .replace("Final", "the Final");
          newMoments.push({
            id: `${momentId}-adv`,
            sourceId: `${momentId}-adv`,
            type: "advancing",
            text: generateMoment({
              type: "advancing",
              team: winner,
              participant: teamToParticipant[winner],
              score: stageLabel,
            }),
            timestamp: f.date,
            teams: [winner],
          });
        }
        if (
          f.isGroup &&
          f.homeScore !== null &&
          Math.abs(f.homeScore - f.awayScore) >= 3
        ) {
          newMoments.push({
            id: momentId,
            sourceId: momentId,
            type: "goodGame",
            text: generateMoment({
              type: "goodGame",
              team: f.homeTeam,
              opponent: f.awayTeam,
              score: `${f.homeScore}–${f.awayScore}`,
            }),
            timestamp: f.date,
            teams: [f.homeTeam, f.awayTeam],
          });
        }
      });

    if (newMoments.length) {
      const allMoments = [...newMoments, ...existingMoments]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50);
      await store.setJSON("moments", {
        moments: allMoments,
        updatedAt: now.toISOString(),
      });
      log.push(`Added ${newMoments.length} new moments`);
    } else {
      log.push("No new moments");
    }

    // ── 5. Meta ───────────────────────────────────────────────────────────────
    const todayStr = now.toISOString().slice(0, 10);
    const gamesToday = fixtures.filter((f) => f.date?.startsWith(todayStr));
    await store.setJSON("meta", {
      lastSync: now.toISOString(),
      hasGamesToday: gamesToday.length > 0,
      hasLiveGames: false, // openfootball doesn't do live — poll handles nothing on game days
      gamesToday: gamesToday.length,
    });

    return new Response(JSON.stringify({ ok: true, log }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Sync error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
