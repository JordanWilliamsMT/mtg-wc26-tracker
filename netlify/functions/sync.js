// netlify/functions/sync.js
// Runs on schedule (7am UTC daily) + on-demand from admin panel
// Sources:
//   Fixtures + Standings → balldontlie.io FIFA WC API (free, key required)
//   Odds               → the-odds-api.com (free, key required)

import { getStore } from "@netlify/blobs";

const BDL_BASE = "https://api.balldontlie.io/fifa/worldcup/v1";
const ODDS_BASE = "https://api.the-odds-api.com/v4";

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

async function bdlGet(path, params = {}) {
  const url = new URL(`${BDL_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: process.env.BDL_API_KEY },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BDL ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.data || json;
}

async function oddsGet(path, params = {}) {
  const url = new URL(`${ODDS_BASE}${path}`);
  url.searchParams.set("apiKey", process.env.ODDS_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Odds API ${path} → ${res.status}`);
  return res.json();
}

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

    // 1. Fixtures
    log.push("Fetching fixtures...");
    const fixturesRaw = await bdlGet("/games");
    const fixtures = fixturesRaw.map((f) => ({
      id: f.id,
      date: f.date_time || f.date,
      status:
        f.status === "final"
          ? "FT"
          : f.status === "in_progress"
            ? "1H"
            : f.status === "halftime"
              ? "HT"
              : "NS",
      homeTeam: f.home_team?.name || f.home_team,
      awayTeam: f.away_team?.name || f.away_team,
      homeScore: f.home_team_score ?? null,
      awayScore: f.away_team_score ?? null,
      round: f.round || f.stage || "",
      venue: f.venue?.name || f.stadium || "",
    }));
    await store.setJSON("fixtures", { fixtures, updatedAt: now.toISOString() });
    log.push(`Stored ${fixtures.length} fixtures`);

    // 2. Standings + Odds (skip on live poll)
    if (!isLivePoll) {
      log.push("Fetching standings...");
      const standingsRaw = await bdlGet("/group_standings");
      const groups = {};
      standingsRaw.forEach((entry) => {
        const groupName = entry.group?.name || `Group ${entry.group}`;
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push({
          team: entry.team?.name || entry.team,
          rank: entry.position || groups[groupName].length + 1,
          pts: entry.points || 0,
          played: entry.played || 0,
          won: entry.won || 0,
          drawn: entry.drawn || 0,
          lost: entry.lost || 0,
          gf: entry.goals_for || 0,
          ga: entry.goals_against || 0,
          gd: entry.goal_difference || 0,
          form: entry.form || "",
        });
      });
      Object.keys(groups).forEach((g) =>
        groups[g].sort((a, b) => a.rank - b.rank),
      );
      await store.setJSON("standings", {
        groups,
        updatedAt: now.toISOString(),
      });
      log.push(`Stored ${Object.keys(groups).length} groups`);

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

    // 3. Moments
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
        const isKnockout =
          f.round &&
          !f.round.toLowerCase().includes("group") &&
          !f.round.toLowerCase().includes("matchday");

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
          !isKnockout &&
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

    // 4. Meta
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
