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
        const eliminated = (p.teams || []).map((t) => {
          // A team is out if they lost in a knockout round
          const lost = fixtureList.some(
            (f) =>
              (f.status === "FT" || f.status === "AET" || f.status === "PEN") &&
              !f.round?.toLowerCase().includes("group") &&
              ((f.homeTeam === t && f.homeScore < f.awayScore) ||
                (f.awayTeam === t && f.awayScore < f.homeScore)),
          );
          return lost;
        });

        // Last team standing: furthest round reached
        const rounds = [
          "Group Stage",
          "Round of 32",
          "Round of 16",
          "Quarter-finals",
          "Semi-finals",
          "Final",
          "World Cup Final",
        ];
        const furthestRound = (p.teams || []).reduce((best, t) => {
          const teamMatches = fixtureList.filter(
            (f) =>
              (f.status === "FT" || f.status === "AET" || f.status === "PEN") &&
              (f.homeTeam === t || f.awayTeam === t),
          );
          if (!teamMatches.length) return best;
          const lastMatch = teamMatches[teamMatches.length - 1];
          const roundIdx = rounds.findIndex((r) =>
            lastMatch.round?.includes(r.split(" ")[0]),
          );
          return roundIdx > best ? roundIdx : best;
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
