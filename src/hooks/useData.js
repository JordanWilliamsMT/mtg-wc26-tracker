import { useState, useEffect, useCallback, useRef } from "react";

async function fetchKey(key) {
  const res = await fetch(`/api/data?key=${key}`);
  if (!res.ok) throw new Error(`Failed to fetch ${key}`);
  return res.json();
}

export function useData() {
  const [fixtures, setFixtures] = useState(null);
  const [standings, setStandings] = useState(null);
  const [odds, setOdds] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [moments, setMoments] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const pollRef = useRef(null);

  const refresh = useCallback(
    async (
      keys = [
        "fixtures",
        "standings",
        "odds",
        "participants",
        "moments",
        "meta",
      ],
    ) => {
      try {
        const results = await Promise.allSettled(keys.map((k) => fetchKey(k)));
        const map = Object.fromEntries(
          keys.map((k, i) => [
            k,
            results[i].status === "fulfilled" ? results[i].value : null,
          ]),
        );
        if (map.fixtures) setFixtures(map.fixtures);
        if (map.standings) setStandings(map.standings);
        if (map.odds) setOdds(map.odds);
        if (map.participants) setParticipants(map.participants);
        if (map.moments) setMoments(map.moments);
        if (map.meta) setMeta(map.meta);
        setLastRefresh(new Date());
      } catch (e) {
        console.error("Data refresh error:", e);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live polling — every 5 mins if there are games today
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(
      () => {
        if (meta?.hasGamesToday) {
          refresh(["fixtures", "moments", "meta"]);
        }
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(pollRef.current);
  }, [meta?.hasGamesToday, refresh]);

  // ── Leaderboard calculation ────────────────────────────────────────────────
  // Win probability = sum of participant's two teams' odds (normalised)
  function getLeaderboard() {
    const pList = participants?.participants || [];
    const oddsMap = odds?.odds || {};

    return pList
      .map((p) => {
        const teamOdds = (p.teams || []).map((t) => oddsMap[t] || 0);
        const totalWinChance = Math.round(
          (teamOdds[0] || 0) + (teamOdds[1] || 0),
        );

        // Is each team still alive?
        const fixtureList = fixtures?.fixtures || [];
        const isKO = (f) =>
          !f.round?.toLowerCase().includes("group") && !f.isGroup;
        const finished = (f) =>
          f.status === "FT" || f.status === "AET" || f.status === "PEN";
        // Prefer the API winner field — score comparison misses penalty shootouts
        const teamLostMatch = (f, t) => {
          if (f.homeTeam === t)
            return f.winner
              ? f.winner === "AWAY_TEAM"
              : f.homeScore < f.awayScore;
          if (f.awayTeam === t)
            return f.winner
              ? f.winner === "HOME_TEAM"
              : f.awayScore < f.homeScore;
          return false;
        };
        const eliminated = (p.teams || []).map((t) => {
          // Out if they lost a knockout match...
          const lostKO = fixtureList.some(
            (f) => finished(f) && isKO(f) && teamLostMatch(f, t),
          );
          // ...or never made the knockout stage at all (group-stage exit).
          // Once the R32 draw is populated, any team absent from every
          // knockout fixture didn't qualify.
          const koFixtures = fixtureList.filter(isKO);
          const koStarted = koFixtures.some((f) => f.homeTeam && f.awayTeam);
          const inKnockout = koFixtures.some(
            (f) => f.homeTeam === t || f.awayTeam === t,
          );
          return lostKO || (koStarted && !inKnockout);
        });

        // Last team standing: furthest round reached
        const rounds = [
          "Group",
          "Round of 32",
          "Round of 16",
          "Quarter-finals",
          "Semi-finals",
          "Final",
        ];
        const canonical = (round) => {
          if (!round) return null;
          const r = round.toUpperCase();
          if (r.includes("GROUP")) return "Group";
          if (r.includes("32")) return "Round of 32";
          if (r.includes("16")) return "Round of 16";
          if (r.includes("QUARTER")) return "Quarter-finals";
          if (r.includes("SEMI")) return "Semi-finals";
          if (r.includes("THIRD") || r.includes("PLACE")) return "Semi-finals";
          if (r.includes("FINAL")) return "Final";
          return null;
        };
        const furthestRound = (p.teams || []).reduce((best, t) => {
          const teamMatches = fixtureList.filter(
            (f) => finished(f) && (f.homeTeam === t || f.awayTeam === t),
          );
          if (!teamMatches.length) return best;
          const teamBest = teamMatches.reduce((idx, m) => {
            const roundIdx = rounds.indexOf(canonical(m.round));
            return roundIdx > idx ? roundIdx : idx;
          }, -1);
          return teamBest > best ? teamBest : best;
        }, -1);

        return {
          ...p,
          winChance: totalWinChance,
          teamOdds,
          eliminated,
          furthestRound,
          teamsAlive: eliminated.filter((e) => !e).length,
        };
      })
      .sort(
        (a, b) => b.winChance - a.winChance || a.name.localeCompare(b.name),
      );
  }

  // ── Tonight's stakes ───────────────────────────────────────────────────────
  function getTonightStakes() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayFixtures = (fixtures?.fixtures || []).filter(
      (f) =>
        f.date?.startsWith(todayStr) &&
        f.status !== "FT" &&
        f.status !== "AET" &&
        f.status !== "PEN",
    );
    const pList = participants?.participants || [];

    return todayFixtures
      .map((f) => {
        const interested = pList.filter((p) =>
          (p.teams || []).some((t) => t === f.homeTeam || t === f.awayTeam),
        );
        return { ...f, interestedParticipants: interested };
      })
      .filter((f) => f.interestedParticipants.length > 0);
  }

  // ── Last team standing ─────────────────────────────────────────────────────
  function getLastTeamStanding() {
    const lb = getLeaderboard();
    return [...lb].sort((a, b) => b.furthestRound - a.furthestRound);
  }

  return {
    fixtures: fixtures?.fixtures || [],
    standings: standings?.groups || {},
    odds: odds?.odds || {},
    participants: participants?.participants || [],
    moments: moments?.moments || [],
    meta,
    loading,
    lastRefresh,
    refresh,
    getLeaderboard,
    getTonightStakes,
    getLastTeamStanding,
  };
}
