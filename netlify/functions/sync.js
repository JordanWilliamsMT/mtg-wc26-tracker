// netlify/functions/sync.js
// Sources:
//   Fixtures + Standings → football-data.org (free tier, key required)
//   Odds                 → the-odds-api.com (free tier, key required)

import { getStore } from "@netlify/blobs";

const FD_BASE = "https://api.football-data.org/v4";
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

async function fdGet(path) {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_KEY },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `football-data ${path} → ${res.status}: ${text.slice(0, 200)}`,
    );
  }
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

// Convert football-data status to our short codes
function parseStatus(s) {
  if (s === "FINISHED") return "FT";
  if (s === "IN_PLAY") return "1H";
  if (s === "PAUSED") return "HT";
  if (s === "TIMED" || s === "SCHEDULED") return "NS";
  return "NS";
}

// Convert UTC date string to BST display string for storage
// We store the raw UTC ISO string and convert in the frontend
function parseFixture(m) {
  const isGroup = m.stage === "GROUP_STAGE";
  return {
    id: m.id,
    date: m.utcDate, // always stored as UTC ISO string
    status: parseStatus(m.status),
    homeTeam: m.homeTeam?.name,
    awayTeam: m.awayTeam?.name,
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    round: isGroup
      ? m.group
        ? `Group ${m.group.replace("GROUP_", "").replace("GROUP ", "").replace("Group_", "")}`
        : "Group Stage"
      : m.stage || m.round || "",
    venue: m.venue || "",
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
    const matchData = await fdGet("/competitions/WC/matches");
    const fixtures = (matchData.matches || []).map(parseFixture);
    await store.setJSON("fixtures", { fixtures, updatedAt: now.toISOString() });
    log.push(`Stored ${fixtures.length} fixtures`);

    // ── 2. Standings ──────────────────────────────────────────────────────────
    if (!isLivePoll) {
      log.push("Fetching standings...");
      try {
        const standData = await fdGet("/competitions/WC/standings");
        const groups = {};

        (standData.standings || []).forEach((stage) => {
          if (stage.type !== "TOTAL") return;
          const groupName = stage.group
            ? `Group ${stage.group.replace("GROUP_", "").replace("GROUP ", "")}`
            : "Standings";
          groups[groupName] = (stage.table || []).map((row) => ({
            team: row.team?.name,
            logo: row.team?.crest,
            rank: row.position,
            pts: row.points,
            played: row.playedGames,
            won: row.won,
            drawn: row.draw,
            lost: row.lost,
            gf: row.goalsFor,
            ga: row.goalsAgainst,
            gd: row.goalDifference,
            form: row.form || "",
          }));
        });

        await store.setJSON("standings", {
          groups,
          updatedAt: now.toISOString(),
        });
        log.push(`Stored ${Object.keys(groups).length} groups`);
      } catch (e) {
        log.push(`Standings failed (non-fatal): ${e.message}`);
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
        log.push(`Odds failed (non-fatal): ${e.message}`);
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

        if (isKnockout && loser)
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
        if (isKnockout && winner)
          newMoments.push({
            id: `${momentId}-adv`,
            sourceId: `${momentId}-adv`,
            type: "advancing",
            text: generateMoment({
              type: "advancing",
              team: winner,
              participant: teamToParticipant[winner],
              score: f.round,
            }),
            timestamp: f.date,
            teams: [winner],
          });

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
      hasLiveGames: gamesToday.some(
        (f) => f.status === "1H" || f.status === "HT",
      ),
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
