import React from "react";
import { Trophy, Flame, Clock, Shield } from "lucide-react";
import { FunFacts } from "./FunFacts";

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function TeamChip({ name, flag, eliminated, winChance }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: eliminated ? "rgba(255,68,68,0.1)" : "var(--navy-4)",
        border: `1px solid ${eliminated ? "rgba(255,68,68,0.25)" : "var(--border)"}`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        color: eliminated ? "var(--red)" : "var(--off-white)",
        textDecoration: eliminated ? "line-through" : "none",
        fontFamily: "var(--font-mono)",
      }}
    >
      {flag} {name}
      {winChance > 0 && (
        <span
          style={{
            color: eliminated ? "var(--red)" : "var(--lime)",
            fontWeight: 600,
          }}
        >
          {winChance}%
        </span>
      )}
    </span>
  );
}

export function Leaderboard({
  leaderboard,
  tonightStakes,
  fixtures,
  participants,
}) {
  const maxChance = leaderboard[0]?.winChance || 1;
  const top5 = leaderboard.slice(0, 5);
  const rest = leaderboard.slice(5);
  const ltsLeader = lastTeamStanding[0];

  return (
    <div>
      {/* Tonight's stakes banner */}
      {tonightStakes.length > 0 && (
        <div
          style={{
            background: "rgba(179,240,0,0.06)",
            borderBottom: "1px solid var(--border-lime)",
            padding: "12px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Flame size={14} color="var(--lime)" />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                letterSpacing: 2,
                color: "var(--lime)",
              }}
            >
              WATCHING TONIGHT
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tonightStakes.map((f) => (
              <div
                key={f.id}
                style={{
                  background: "var(--navy-3)",
                  border: "1px solid var(--border-lime)",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {f.homeTeam} vs {f.awayTeam}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  Riding on it:{" "}
                  {f.interestedParticipants.map((p) => p.name).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main leaderboard header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "16px 20px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Trophy size={14} color="var(--lime)" />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            letterSpacing: 2,
            color: "var(--lime)",
          }}
        >
          LEADERBOARD
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>
          — win probability based on live odds
        </span>
      </div>

      {leaderboard.length === 0 && (
        <div
          style={{
            padding: "3rem 20px",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          <Trophy size={36} strokeWidth={1} style={{ marginBottom: 12 }} />
          <p>No participants yet — add them in the Admin panel</p>
        </div>
      )}

      {/* Top 5 */}
      {top5.map((p, i) => {
        const medal = ["🥇", "🥈", "🥉"][i];
        const isFirst = i === 0;
        return (
          <div
            key={p.id}
            className="slide-up"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              background: isFirst ? "rgba(179,240,0,0.04)" : "transparent",
              borderLeft: `3px solid ${isFirst ? "var(--lime)" : "transparent"}`,
            }}
          >
            <div style={{ minWidth: 28, textAlign: "center" }}>
              {medal ? (
                <span style={{ fontSize: 20 }}>{medal}</span>
              ) : (
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    color: "var(--muted)",
                  }}
                >
                  {i + 1}
                </span>
              )}
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                flexShrink: 0,
                background: isFirst ? "var(--lime)" : "var(--navy-4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 12,
                color: isFirst ? "var(--navy)" : "var(--off-white)",
                border: `1px solid ${isFirst ? "var(--lime)" : "var(--border)"}`,
              }}
            >
              {initials(p.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>
                {p.name}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {(p.teams || []).map((t, ti) => (
                  <TeamChip
                    key={t}
                    name={t}
                    flag={""}
                    eliminated={p.eliminated[ti]}
                    winChance={Math.round(p.teamOdds[ti] || 0)}
                  />
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  letterSpacing: 1,
                  color: isFirst ? "var(--lime)" : "var(--white)",
                  lineHeight: 1,
                }}
              >
                {p.winChance}%
              </div>
              <div
                style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}
              >
                {p.teamsAlive === 2
                  ? "both alive"
                  : p.teamsAlive === 1
                    ? "1 team left"
                    : "💀 all out"}
              </div>
              <div
                style={{
                  width: 80,
                  height: 3,
                  background: "var(--navy-4)",
                  borderRadius: 2,
                  marginTop: 6,
                  marginLeft: "auto",
                }}
              >
                <div
                  style={{
                    width: `${Math.round((p.winChance / maxChance) * 100)}%`,
                    height: "100%",
                    background: "var(--lime)",
                    borderRadius: 2,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Rest */}
      {rest.length > 0 && (
        <>
          <div
            style={{
              padding: "10px 20px 8px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--muted)",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              The rest
            </span>
          </div>
          {rest.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--muted)",
                  minWidth: 20,
                }}
              >
                {i + 6}
              </span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--navy-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                {initials(p.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  {p.name}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(p.teams || []).map((t, ti) => (
                    <TeamChip
                      key={t}
                      name={t}
                      flag={""}
                      eliminated={p.eliminated[ti]}
                      winChance={Math.round(p.teamOdds[ti] || 0)}
                    />
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {p.winChance}%
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {p.teamsAlive === 0 ? "💀" : `${p.teamsAlive} alive`}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
