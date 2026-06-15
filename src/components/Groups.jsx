import React from "react";
import { LayoutGrid } from "lucide-react";

function FormDot({ result }) {
  const color =
    result === "W"
      ? "var(--green)"
      : result === "L"
        ? "var(--red)"
        : "var(--amber)";
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
      title={result}
    />
  );
}

function GroupTable({ name, teams }) {
  return (
    <div
      style={{
        background: "var(--navy-3)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--navy-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            letterSpacing: 2,
            color: "var(--lime)",
          }}
        >
          {name}
        </span>
      </div>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
      >
        <thead>
          <tr style={{ color: "var(--muted)" }}>
            <th
              style={{
                padding: "6px 14px",
                textAlign: "left",
                fontWeight: 500,
              }}
            >
              #
            </th>
            <th
              style={{ padding: "6px 6px", textAlign: "left", fontWeight: 500 }}
            >
              Team
            </th>
            <th
              style={{
                padding: "6px 6px",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              P
            </th>
            <th
              style={{
                padding: "6px 6px",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              W
            </th>
            <th
              style={{
                padding: "6px 6px",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              D
            </th>
            <th
              style={{
                padding: "6px 6px",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              L
            </th>
            <th
              style={{
                padding: "6px 6px",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              GD
            </th>
            <th
              style={{
                padding: "6px 10px",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              Pts
            </th>
            <th
              style={{
                padding: "6px 14px 6px 6px",
                textAlign: "left",
                fontWeight: 500,
              }}
            >
              Form
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => {
            const qualifying = i < 2; // top 2 qualify from each group (WC2026 R32 format)
            return (
              <tr
                key={t.team}
                style={{
                  borderTop: "1px solid var(--border)",
                  background: qualifying
                    ? "rgba(0,214,143,0.04)"
                    : "transparent",
                }}
              >
                <td
                  style={{
                    padding: "8px 14px",
                    color: "var(--muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                >
                  {t.rank}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {t.logo && (
                      <img
                        src={t.logo}
                        alt=""
                        style={{ width: 16, height: 16, objectFit: "contain" }}
                      />
                    )}
                    <span
                      style={{
                        fontWeight: qualifying ? 500 : 400,
                        color: qualifying ? "var(--white)" : "var(--off-white)",
                      }}
                    >
                      {t.team}
                    </span>
                    {qualifying && (
                      <span
                        style={{
                          fontSize: 9,
                          color: "var(--green)",
                          background: "rgba(0,214,143,0.1)",
                          border: "1px solid rgba(0,214,143,0.2)",
                          borderRadius: 3,
                          padding: "1px 4px",
                        }}
                      >
                        Q
                      </span>
                    )}
                  </div>
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {t.played}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    color: "var(--green)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {t.won}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    color: "var(--amber)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {t.drawn}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    color: "var(--red)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {t.lost}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    color:
                      t.gd > 0
                        ? "var(--green)"
                        : t.gd < 0
                          ? "var(--red)"
                          : "var(--muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {t.gd > 0 ? "+" : ""}
                  {t.gd}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    color: "var(--lime)",
                  }}
                >
                  {t.pts}
                </td>
                <td style={{ padding: "8px 14px 8px 6px" }}>
                  <div style={{ display: "flex", gap: 3 }}>
                    {(t.form || "")
                      .split("")
                      .slice(-5)
                      .map((r, i) => (
                        <FormDot key={i} result={r} />
                      ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Groups({ standings }) {
  const groups = Object.entries(standings).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "16px 20px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <LayoutGrid size={14} color="var(--lime)" />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            letterSpacing: 2,
            color: "var(--lime)",
          }}
        >
          GROUPS
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>
          — top 2 from each group advance
        </span>
      </div>

      {groups.length === 0 ? (
        <div
          style={{
            padding: "3rem 20px",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          Group stage standings will appear here once the tournament begins
        </div>
      ) : (
        <div
          style={{
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          {groups.map(([name, teams]) => (
            <GroupTable key={name} name={name} teams={teams} />
          ))}
        </div>
      )}
    </div>
  );
}
