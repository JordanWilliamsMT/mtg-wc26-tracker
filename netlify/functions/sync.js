// netlify/functions/sync.js
// Sources:
//   Fixtures + Standings → football-data.org (free tier, key required)
//   Odds                 → the-odds-api.com (free tier, key required)

import { getStore } from "@netlify/blobs";

const FD_BASE = "https://api.football-data.org/v4";
const ODDS_BASE = "https://api.the-odds-api.com/v4";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMoment({
  type,
  team,
  participant,
  opponent,
  homeScore,
  awayScore,
  loserParticipant,
}) {
  const score = `${homeScore}–${awayScore}`;
  const diff = Math.abs(homeScore - awayScore);

  switch (type) {
    case "win_big":
      return pick([
        `🔥 ${team} absolutely batter ${opponent} ${score}.${participant ? ` ${participant} is over the moon.` : ""}${loserParticipant ? ` ${loserParticipant} wants the ground to swallow them.` : ""}`,
        `💥 ${score}! ${team} are not messing about.${participant ? ` ${participant} doing a little dance at their desk.` : ""}${loserParticipant ? ` ${loserParticipant} in shambles.` : ""}`,
      ]);
    case "win":
      return pick([
        `✅ ${team} beat ${opponent} ${score}.${participant ? ` ${participant} will take that.` : ""}${loserParticipant ? ` Tough luck for ${loserParticipant}.` : ""}`,
        `⚽ ${score} — ${team} see off ${opponent}.${participant ? ` Good day for ${participant}.` : ""}${loserParticipant ? ` Bad day for ${loserParticipant}.` : ""}`,
        `👊 ${team} grind out a ${score} win vs ${opponent}.${participant ? ` ${participant} breathing again.` : ""}`,
      ]);
    case "draw":
      return pick([
        `🤝 ${team} and ${opponent} share the spoils ${score}.${participant ? ` ${participant} not thrilled.` : ""}${loserParticipant ? ` ${loserParticipant} not thrilled either.` : ""}`,
        `😐 ${score} — ${team} vs ${opponent}. Could've been worse. Could've been better.${participant ? ` ${participant} shrugs.` : ""}`,
        `🥱 ${team} ${score} ${opponent}. Boring draw.${participant && loserParticipant ? ` ${participant} and ${loserParticipant} both miserable.` : ""}`,
      ]);
    case "eliminated":
      return pick([
        `💀 ${team} are OUT of the World Cup.${participant ? ` Absolutely gutting for ${participant} — pour one out.` : " Someone just had their dreams crushed."}`,
        `⚰️ RIP ${team}.${participant ? ` ${participant} can go home early. Brutal.` : " Another one bites the dust."}`,
        `🪦 ${team} eliminated.${participant ? ` ${participant} is now just here for the vibes.` : " The dream is dead."}`,
        `😬 ${team} bottle it and go home.${participant ? ` ${participant} didn't even make it to the good bit. Rough.` : " Gone. Just like that."}`,
      ]);
    case "advancing":
      return pick([
        `🔥 ${team} through to the ${opponent}!${participant ? ` ${participant} is absolutely buzzing.` : " Still alive!"}`,
        `✅ ${team} progress to the ${opponent}.${participant ? ` Good times for ${participant}.` : " Keep the dream alive."}`,
        `🚀 ${team} marching on to the ${opponent}!${participant ? ` ${participant} can sleep easy tonight.` : ""}`,
      ]);
    case "winner":
      return pick([
        `🏆 ${team} ARE WORLD CHAMPIONS!${participant ? ` ${participant} WINS THE SWEEPSTAKE! 🎉🎉🎉` : " What a tournament!"}`,
        `👑 ${team} lift the trophy!${participant ? ` ${participant} — get your money! 🎉` : " Champions of the world!"}`,
      ]);
    default:
      return `⚽ ${team} ${score} ${opponent}`;
  }
}

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

function parseStatus(s) {
  if (s === "FINISHED") return "FT";
  if (s === "IN_PLAY") return "1H";
  if (s === "PAUSED") return "HT";
  if (s === "TIMED" || s === "SCHEDULED") return "NS";
  return "NS";
}

function parseFixture(m) {
  const isGroup = m.stage === "GROUP_STAGE";
  const group = m.group
    ? `Group ${m.group.replace("GROUP_", "").replace("GROUP ", "")}`
    : null;
  return {
    id: m.id,
    date: m.utcDate,
    status: parseStatus(m.status),
    homeTeam: m.homeTeam?.name,
    awayTeam: m.awayTeam?.name,
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    round: isGroup ? group || "Group Stage" : m.stage || "",
    venue: m.venue || "",
    isGroup,
  };
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

    // ── 4. Moments — one post per game ────────────────────────────────────────
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
      .filter((f) => f.status === "FT" && f.homeScore !== null)
      .forEach((f) => {
        const momentId = `result-${f.id}`;
        if (seenIds.has(momentId)) return;

        const { homeTeam, awayTeam, homeScore, awayScore, isGroup, round } = f;
        const diff = Math.abs(homeScore - awayScore);
        const homeWon = homeScore > awayScore;
        const awayWon = awayScore > homeScore;
        const isDraw = homeScore === awayScore;
        const homeP = teamToParticipant[homeTeam];
        const awayP = teamToParticipant[awayTeam];

        if (isGroup) {
          // One moment per game — winner is the "team", loser is "opponent"
          // Both participants mentioned in the same post
          if (isDraw) {
            newMoments.push({
              id: momentId,
              sourceId: momentId,
              type: "draw",
              text: generateMoment({
                type: "draw",
                team: homeTeam,
                opponent: awayTeam,
                participant: homeP,
                loserParticipant: homeP !== awayP ? awayP : null,
                homeScore,
                awayScore,
              }),
              timestamp: f.date,
              teams: [homeTeam, awayTeam],
            });
          } else {
            const winner = homeWon ? homeTeam : awayTeam;
            const loser = homeWon ? awayTeam : homeTeam;
            const winnerP = homeWon ? homeP : awayP;
            const loserP = homeWon ? awayP : homeP;
            const winnerScore = homeWon ? homeScore : awayScore;
            const loserScore = homeWon ? awayScore : homeScore;
            newMoments.push({
              id: momentId,
              sourceId: momentId,
              type: diff >= 3 ? "win_big" : "win",
              text: generateMoment({
                type: diff >= 3 ? "win_big" : "win",
                team: winner,
                opponent: loser,
                participant: winnerP,
                loserParticipant: winnerP !== loserP ? loserP : null,
                homeScore: winnerScore,
                awayScore: loserScore,
              }),
              timestamp: f.date,
              teams: [winner, loser],
            });
          }
        } else {
          // Knockout — one elimination moment mentioning both
          const winner = homeWon ? homeTeam : awayTeam;
          const loser = homeWon ? awayTeam : homeTeam;
          const winP = homeWon ? homeP : awayP;
          const loseP = homeWon ? awayP : homeP;
          const stage = round
            .replace("ROUND_OF_32", "R32")
            .replace("ROUND_OF_16", "R16")
            .replace("QUARTER_FINALS", "QF")
            .replace("SEMI_FINALS", "SF")
            .replace("FINAL", "the Final");

          newMoments.push({
            id: `${momentId}-elim`,
            sourceId: `${momentId}-elim`,
            type: "eliminated",
            text: generateMoment({
              type: "eliminated",
              team: loser,
              participant: loseP,
              homeScore,
              awayScore,
            }),
            timestamp: f.date,
            teams: [loser],
          });
          newMoments.push({
            id: `${momentId}-adv`,
            sourceId: `${momentId}-adv`,
            type: "advancing",
            text: generateMoment({
              type: "advancing",
              team: winner,
              opponent: stage,
              participant: winP,
              homeScore,
              awayScore,
            }),
            timestamp: f.date,
            teams: [winner],
          });

          if (round === "FINAL") {
            newMoments.push({
              id: `${momentId}-champ`,
              sourceId: `${momentId}-champ`,
              type: "winner",
              text: generateMoment({
                type: "winner",
                team: winner,
                participant: winP,
              }),
              timestamp: f.date,
              teams: [winner],
            });
          }
        }
      });

    if (newMoments.length) {
      const allMoments = [...newMoments, ...existingMoments]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 100);
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
