import React, { useState, useEffect } from "react";
import {
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  MessageSquare,
  LogOut,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { TOP_TEAMS, BOTTOM_TEAMS } from "../data/teams";
import { useAdmin } from "../hooks/useAdmin";

function LoginScreen({ onLogin, loading, error }) {
  const [pw, setPw] = useState("");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
      }}
    >
      <div
        style={{
          width: 320,
          background: "var(--navy-3)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "28px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Lock size={18} color="var(--lime)" />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              letterSpacing: 2,
            }}
          >
            ADMIN
          </span>
        </div>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onLogin(pw)}
          placeholder="Password"
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "var(--navy-4)",
            border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
            borderRadius: "var(--radius-sm)",
            color: "var(--white)",
            fontSize: 14,
            marginBottom: 10,
          }}
          autoFocus
        />
        {error && (
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <AlertCircle size={13} color="var(--red)" />
            <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span>
          </div>
        )}
        <button
          onClick={() => onLogin(pw)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "var(--lime)",
            color: "var(--navy)",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            fontWeight: 600,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Checking…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

export function Admin({ onDataChange }) {
  const { authed, login, logout, call, loading, error, setError } = useAdmin();
  const [participants, setParticipants] = useState([]);
  const [name, setName] = useState("");
  const [topTeam, setTopTeam] = useState("");
  const [botTeam, setBotTeam] = useState("");
  const [addError, setAddError] = useState("");
  const [momentText, setMomentText] = useState("");
  const [syncLog, setSyncLog] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    if (authed) loadParticipants();
  }, [authed]);

  async function loadParticipants() {
    try {
      const data = await call("getParticipants");
      setParticipants(data.participants || []);
    } catch {}
  }

  const usedTop = new Set(
    participants.map((p) => p.teams?.[0]).filter(Boolean),
  );
  const usedBot = new Set(
    participants.map((p) => p.teams?.[1]).filter(Boolean),
  );

  async function addParticipant() {
    setAddError("");
    if (!name.trim()) return setAddError("Enter a name");
    if (!topTeam) return setAddError("Pick a top team");
    if (!botTeam) return setAddError("Pick a bottom team");
    if (
      participants.find(
        (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
      )
    )
      return setAddError("Name taken");
    const updated = [
      ...participants,
      {
        id: Date.now().toString(),
        name: name.trim(),
        teams: [topTeam, botTeam],
      },
    ];
    await call("saveParticipants", { participants: updated });
    setParticipants(updated);
    setName("");
    setTopTeam("");
    setBotTeam("");
    onDataChange?.();
    showToast("Participant added");
  }

  async function removeParticipant(id) {
    const updated = participants.filter((p) => p.id !== id);
    await call("saveParticipants", { participants: updated });
    setParticipants(updated);
    onDataChange?.();
  }

  async function addMoment() {
    if (!momentText.trim()) return;
    await call("addMoment", { text: momentText.trim() });
    setMomentText("");
    onDataChange?.();
    showToast("Moment posted");
  }

  async function forceSync() {
    setSyncing(true);
    setSyncLog([]);
    try {
      const data = await call("forceSync");
      setSyncLog(data.log || ["Sync complete"]);
      onDataChange?.();
      showToast("Sync complete!");
    } catch (e) {
      setSyncLog([`Error: ${e.message}`]);
    } finally {
      setSyncing(false);
    }
  }

  if (!authed) {
    return <LoginScreen onLogin={login} loading={loading} error={error} />;
  }

  return (
    <div
      style={{
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 700,
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--navy-4)",
            border: "1px solid var(--border-lime)",
            borderRadius: "var(--radius-md)",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 999,
            animation: "slideUp 0.3s ease",
          }}
        >
          <CheckCircle size={14} color="var(--lime)" />
          <span style={{ fontSize: 13, color: "var(--white)" }}>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={14} color="var(--lime)" />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              letterSpacing: 2,
              color: "var(--lime)",
            }}
          >
            ADMIN
          </span>
        </div>
        <button
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "var(--navy-4)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          <LogOut size={12} /> Sign out
        </button>
      </div>

      {/* Force sync */}
      <Section title="Data sync">
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          Auto-syncs at 7am UTC daily. Use this to force a sync after a game.
        </p>
        <button
          onClick={forceSync}
          disabled={syncing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            background: "var(--lime)",
            color: "var(--navy)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
            fontWeight: 600,
            opacity: syncing ? 0.7 : 1,
          }}
        >
          <RefreshCw
            size={14}
            style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}
          />
          {syncing ? "Syncing…" : "Force sync now"}
        </button>
        {syncLog.length > 0 && (
          <div
            style={{
              marginTop: 12,
              background: "var(--navy-4)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
            }}
          >
            {syncLog.map((l, i) => (
              <p
                key={i}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--off-white)",
                  lineHeight: 1.8,
                }}
              >
                {l}
              </p>
            ))}
          </div>
        )}
      </Section>

      {/* Participants */}
      <Section title={`Participants (${participants.length}/22)`}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            placeholder="Name"
            style={{
              flex: "1 1 140px",
              padding: "8px 12px",
              background: "var(--navy-4)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--white)",
              fontSize: 13,
            }}
          />
          <select
            value={topTeam}
            onChange={(e) => setTopTeam(e.target.value)}
            style={{
              flex: "1 1 160px",
              padding: "8px 12px",
              background: "var(--navy-4)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: topTeam ? "var(--white)" : "var(--muted)",
              fontSize: 13,
            }}
          >
            <option value="">Top team…</option>
            {TOP_TEAMS.map((t) => (
              <option
                key={t.name}
                value={t.name}
                disabled={usedTop.has(t.name)}
              >
                {t.flag} {t.name}
                {usedTop.has(t.name) ? " (taken)" : ""}
              </option>
            ))}
          </select>
          <select
            value={botTeam}
            onChange={(e) => setBotTeam(e.target.value)}
            style={{
              flex: "1 1 160px",
              padding: "8px 12px",
              background: "var(--navy-4)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: botTeam ? "var(--white)" : "var(--muted)",
              fontSize: 13,
            }}
          >
            <option value="">Bottom team…</option>
            {BOTTOM_TEAMS.map((t) => (
              <option
                key={t.name}
                value={t.name}
                disabled={usedBot.has(t.name)}
              >
                {t.flag} {t.name}
                {usedBot.has(t.name) ? " (taken)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={addParticipant}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "var(--lime)",
              color: "var(--navy)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {addError && (
          <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>
            {addError}
          </p>
        )}
        {participants.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "9px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--muted)",
                minWidth: 22,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
              {p.name}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {p.teams?.join(" · ")}
            </span>
            <button
              onClick={() => removeParticipant(p.id)}
              style={{
                background: "transparent",
                color: "var(--muted)",
                padding: 4,
                borderRadius: 4,
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "var(--red)")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--muted)")}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </Section>

      {/* Manual moment */}
      <Section title="Post a moment">
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
          Post a custom message to the moments feed.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={momentText}
            onChange={(e) => setMomentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMoment()}
            placeholder='e.g. "Half time. England 0-0 Colombia 😬"'
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "var(--navy-4)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--white)",
              fontSize: 13,
            }}
          />
          <button
            onClick={addMoment}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "var(--lime)",
              color: "var(--navy)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <MessageSquare size={14} /> Post
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div
      style={{
        background: "var(--navy-3)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--off-white)",
          marginBottom: 14,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
