import React from "react";
import { Sparkles } from "lucide-react";

export function FunFacts({ fixtures, participants }) {
  const finished = fixtures.filter(
    (f) => f.status === "FT" && f.homeScore !== null,
  );
  if (!finished.length || !participants.length) return null;

  // Team → participant lookup
  const teamToP = {};
  participants.forEach((p) => {
    if (p.teams?.[0]) teamToP[p.teams[0]] = p.name;
    if (p.teams?.[1]) teamToP[p.teams[1]] = p.name;
  });

  // Goals scored per participant's teams
  const goalsByP = {};
  participants.forEach((p) => {
    goalsByP[p.name] = 0;
  });
  finished.forEach((f) => {
    const hp = teamToP[f.homeTeam];
    const ap = teamToP[f.awayTeam];
    if (hp) goalsByP[hp] = (goalsByP[hp] || 0) + f.homeScore;
    if (ap) goalsByP[ap] = (goalsByP[ap] || 0) + f.awayScore;
  });
  const topScorer = Object.entries(goalsByP).sort((a, b) => b[1] - a[1])[0];

  // Biggest win
  const biggestWin = [...finished].sort(
    (a, b) =>
      Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore),
  )[0];
  const biggestDiff = biggestWin
    ? Math.abs(biggestWin.homeScore - biggestWin.awayScore)
    : 0;
  const biggestWinner = biggestWin
    ? biggestWin.homeScore > biggestWin.awayScore
      ? biggestWin.homeTeam
      : biggestWin.awayTeam
    : null;

  // Most games played (teams in sweepstake)
  const gamesPlayed = {};
  finished.forEach((f) => {
    if (teamToP[f.homeTeam])
      gamesPlayed[f.homeTeam] = (gamesPlayed[f.homeTeam] || 0) + 1;
    if (teamToP[f.awayTeam])
      gamesPlayed[f.awayTeam] = (gamesPlayed[f.awayTeam] || 0) + 1;
  });
  const mostActive = Object.entries(gamesPlayed).sort((a, b) => b[1] - a[1])[0];

  // Total goals in tournament
  const totalGoals = finished.reduce(
    (s, f) => s + f.homeScore + f.awayScore,
    0,
  );
  const avgGoals = finished.length
    ? (totalGoals / finished.length).toFixed(1)
    : 0;

  const facts = [
    topScorer?.[1] > 0 && {
      emoji: "⚽",
      label: "Most goals (your teams)",
      value: `${topScorer[0]}`,
      sub: `${topScorer[1]} goals scored`,
    },
    biggestWinner &&
      biggestDiff >= 2 && {
        emoji: "💥",
        label: "Biggest win so far",
        value: biggestWinner,
        sub: `${biggestWin.homeTeam} ${biggestWin.homeScore}–${biggestWin.awayScore} ${biggestWin.awayTeam}`,
      },
    mostActive && {
      emoji: "🏃",
      label: "Most active team",
      value: mostActive[0],
      sub: `${mostActive[1]} games played${teamToP[mostActive[0]] ? ` · ${teamToP[mostActive[0]]}` : ""}`,
    },
    finished.length > 0 && {
      emoji: "📊",
      label: "Avg goals per game",
      value: `${avgGoals}`,
      sub: `across ${finished.length} games played`,
    },
  ].filter(Boolean);

  if (!facts.length) return null;

  return (
    <div
      style={{
        background: "var(--navy-3)",
        borderBottom: "1px solid var(--border)",
        padding: "10px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <Sparkles size={13} color="var(--amber)" />
        <span
          style={{
            fontSize: 11,
            color: "var(--amber)",
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Fun facts
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {facts.map((f, i) => (
          <div
            key={i}
            style={{
              background: "var(--navy-4)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>{f.emoji}</span>
            <div>
              <div
                style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}
              >
                {f.label}
              </div>
              <div
                style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}
              >
                {f.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
