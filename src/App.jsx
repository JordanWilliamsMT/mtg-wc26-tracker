import React, { useState } from "react";
import {
  Trophy,
  Calendar,
  LayoutGrid,
  GitBranch,
  Zap,
  Lock,
  RefreshCw,
} from "lucide-react";
import { useData } from "./hooks/useData";
import { Leaderboard } from "./components/Leaderboard";
import { Fixtures } from "./components/Fixtures";
import { Groups } from "./components/Groups";
import { Bracket } from "./components/Bracket";
import { Moments } from "./components/Moments";
import { Admin } from "./components/Admin";

const TABS = [
  { key: "leaderboard", label: "Leaderboard", Icon: Trophy },
  { key: "fixtures", label: "Fixtures", Icon: Calendar },
  { key: "groups", label: "Groups", Icon: LayoutGrid },
  { key: "bracket", label: "Bracket", Icon: GitBranch },
  { key: "moments", label: "Moments", Icon: Zap },
  { key: "admin", label: "Admin", Icon: Lock },
];

export default function App() {
  const [tab, setTab] = useState("leaderboard");
  const data = useData();
  const leaderboard = data.getLeaderboard();
  const tonightStakes = data.getTonightStakes();
  const liveCount = data.fixtures.filter((f) =>
    ["1H", "HT", "2H", "ET", "P"].includes(f.status),
  ).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Nav */}
      <header
        style={{
          background: "var(--navy-2)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 0 0 16px",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingRight: 20,
            borderRight: "1px solid var(--border)",
            flexShrink: 0,
            height: 52,
          }}
        >
          <span style={{ fontSize: 22 }}>⚽</span>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                letterSpacing: 3,
                color: "var(--lime)",
                lineHeight: 1,
              }}
            >
              WC26
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--muted)",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Sweepstake
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ display: "flex", flex: 1, height: 52 }}>
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "0 16px",
                height: "100%",
                background: "transparent",
                color: tab === key ? "var(--white)" : "var(--muted)",
                fontSize: 13,
                fontWeight: tab === key ? 600 : 400,
                whiteSpace: "nowrap",
                borderBottom:
                  tab === key
                    ? "2px solid var(--lime)"
                    : "2px solid transparent",
                transition: "color 0.15s",
              }}
            >
              <Icon
                size={14}
                style={{ color: tab === key ? "var(--lime)" : "inherit" }}
              />
              {label}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            borderLeft: "1px solid var(--border)",
            height: 52,
            flexShrink: 0,
          }}
        >
          {liveCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(179,240,0,0.08)",
                border: "1px solid var(--border-lime)",
                borderRadius: 20,
                padding: "4px 10px",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--lime)",
                  animation: "pulse 1s infinite",
                  display: "inline-block",
                }}
              />
              <span
                style={{ fontSize: 11, color: "var(--lime)", fontWeight: 600 }}
              >
                {liveCount} LIVE
              </span>
            </div>
          )}
          {data.meta?.lastSync && (
            <span
              style={{
                fontSize: 10,
                color: "var(--muted)",
                whiteSpace: "nowrap",
              }}
            >
              Synced{" "}
              {new Date(data.meta.lastSync).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={() => data.refresh()}
            title="Refresh data"
            style={{
              background: "transparent",
              color: "var(--muted)",
              padding: 4,
              borderRadius: 4,
              transition: "color 0.15s",
              display: "flex",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--lime)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--muted)")}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </header>

      {/* Loading */}
      {data.loading && (
        <div
          style={{
            flexShrink: 0,
            background: "rgba(179,240,0,0.06)",
            borderBottom: "1px solid var(--border-lime)",
            padding: "8px 20px",
            fontSize: 12,
            color: "var(--lime)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RefreshCw
            size={12}
            style={{ animation: "spin 1s linear infinite" }}
          />
          Loading tournament data…
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {tab === "leaderboard" && (
            <Leaderboard
              leaderboard={leaderboard}
              tonightStakes={tonightStakes}
              fixtures={data.fixtures}
              participants={data.participants}
            />
          )}
          {tab === "fixtures" && <Fixtures fixtures={data.fixtures} />}
          {tab === "groups" && <Groups standings={data.standings} />}
          {tab === "bracket" && <Bracket fixtures={data.fixtures} />}
          {tab === "moments" && (
            <Moments moments={data.moments} odds={data.odds} />
          )}
          {tab === "admin" && <Admin onDataChange={() => data.refresh()} />}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
      `}</style>
    </div>
  );
}
