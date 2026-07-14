import React, { useState } from "react";
import { Calendar, Radio, CheckCircle, Clock } from "lucide-react";

const ROUND_ORDER = [
  "Group",
  "Round of 32",
  "Round of 16",
  "Quarter",
  "Semi",
  "Final",
];

function roundLabel(round) {
  if (!round) return "";
  const r = round.toUpperCase();
  if (r.includes("GROUP")) return round;
  if (r.includes("32")) return "Round of 32";
  if (r.includes("16")) return "Round of 16";
  if (r.includes("QUARTER")) return "Quarter-final";
  if (r.includes("SEMI")) return "Semi-final";
  if (r.includes("THIRD") || r.includes("PLACE")) return "Third place";
  if (r.includes("FINAL")) return "Final";
  return round;
}

function statusLabel(status) {
  const map = {
    NS: "Upcoming",
    "1H": "1st Half",
    HT: "Half Time",
    "2H": "2nd Half",
    ET: "Extra Time",
    P: "Penalties",
    FT: "Full Time",
    AET: "AET",
    PEN: "Pens",
  };
  return map[status] || status;
}

function isLive(status) {
  return ["1H", "HT", "2H", "ET", "BT", "P", "INT"].includes(status);
}

function formatKickoff(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Europe/London",
    }) +
    " · " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    })
  );
}

function MatchCard({ match }) {
  const live = isLive(match.status);
  const finished =
    match.status === "FT" || match.status === "AET" || match.status === "PEN";
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <div
      style={{
        background: live ? "rgba(179,240,0,0.05)" : "var(--navy-3)",
        border: `1px solid ${live ? "var(--border-lime)" : "var(--border)"}`,
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {live && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "var(--lime)",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--muted)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        <span>{roundLabel(match.round)}</span>
        <span
          style={{
            color: live
              ? "var(--lime)"
              : finished
                ? "var(--muted)"
                : "var(--off-white)",
          }}
        >
          {live && (
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--lime)",
                marginRight: 5,
                animation: "pulse 1s infinite",
                verticalAlign: "middle",
              }}
            />
          )}
          {statusLabel(match.status)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            textAlign: "right",
            color:
              finished && match.homeScore > match.awayScore
                ? "var(--white)"
                : "var(--off-white)",
          }}
        >
          {match.homeTeam}
        </span>
        {hasScore ? (
          <div
            style={{
              display: "flex",
              gap: 5,
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 20,
            }}
          >
            <span
              style={{
                color:
                  match.homeScore > match.awayScore
                    ? "var(--lime)"
                    : "var(--off-white)",
              }}
            >
              {match.homeScore}
            </span>
            <span style={{ color: "var(--navy-4)", fontSize: 13 }}>—</span>
            <span
              style={{
                color:
                  match.awayScore > match.homeScore
                    ? "var(--lime)"
                    : "var(--off-white)",
              }}
            >
              {match.awayScore}
            </span>
          </div>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--muted)",
              padding: "2px 8px",
              background: "var(--navy-4)",
              borderRadius: 4,
            }}
          >
            vs
          </span>
        )}
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            color:
              finished && match.awayScore > match.homeScore
                ? "var(--white)"
                : "var(--off-white)",
          }}
        >
          {match.awayTeam}
        </span>
      </div>
      {!live && !finished && (
        <div
          style={{
            textAlign: "center",
            marginTop: 6,
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          {formatKickoff(match.date)}
        </div>
      )}
      {match.venue && (
        <div
          style={{
            textAlign: "center",
            marginTop: 4,
            fontSize: 10,
            color: "var(--muted)",
          }}
        >
          {match.venue}
        </div>
      )}
    </div>
  );
}

export function Fixtures({ fixtures }) {
  const [filter, setFilter] = useState("all");
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const live = fixtures.filter((f) => isLive(f.status));
  const today = fixtures.filter(
    (f) =>
      f.date?.startsWith(todayStr) && !isLive(f.status) && f.status === "NS",
  );
  const upcoming = fixtures
    .filter((f) => f.status === "NS" && !f.date?.startsWith(todayStr))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 12);
  const results = fixtures
    .filter(
      (f) => f.status === "FT" || f.status === "AET" || f.status === "PEN",
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 16);

  const filters = [
    { key: "all", label: "All" },
    { key: "live", label: `Live${live.length ? ` (${live.length})` : ""}` },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "results", label: "Results" },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={14} color="var(--lime)" />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              letterSpacing: 2,
              color: "var(--lime)",
            }}
          >
            FIXTURES
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                background: filter === f.key ? "var(--lime)" : "var(--navy-4)",
                color: filter === f.key ? "var(--navy)" : "var(--muted)",
                border: `1px solid ${filter === f.key ? "var(--lime)" : "var(--border)"}`,
                fontWeight: filter === f.key ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {(filter === "all" || filter === "live") && live.length > 0 && (
          <Section
            icon={<Radio size={12} color="var(--lime)" />}
            label="Live now"
            color="var(--lime)"
          >
            <Grid>
              {live.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </Grid>
          </Section>
        )}
        {(filter === "all" || filter === "today") && today.length > 0 && (
          <Section
            icon={<Clock size={12} color="var(--amber)" />}
            label="Today"
            color="var(--amber)"
          >
            <Grid>
              {today.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </Grid>
          </Section>
        )}
        {(filter === "all" || filter === "upcoming") && upcoming.length > 0 && (
          <Section
            icon={<Clock size={12} color="var(--muted)" />}
            label="Upcoming"
            color="var(--muted)"
          >
            <Grid>
              {upcoming.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </Grid>
          </Section>
        )}
        {(filter === "all" || filter === "results") && results.length > 0 && (
          <Section
            icon={<CheckCircle size={12} color="var(--muted)" />}
            label="Results"
            color="var(--muted)"
          >
            <Grid>
              {results.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </Grid>
          </Section>
        )}
        {fixtures.length === 0 && (
          <p
            style={{
              color: "var(--muted)",
              textAlign: "center",
              padding: "3rem 0",
            }}
          >
            Fixtures will appear here once the tournament begins (June 11 2026)
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ icon, label, color, children }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {icon}
        <span
          style={{
            fontSize: 11,
            color,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}
