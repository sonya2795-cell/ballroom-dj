import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAdminStats } from "../services/adminService.js";

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "#10141b",
  color: "#f2f4f7",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "1.5rem 2rem",
  background: "#1b1f27",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
};

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1.25rem",
  marginTop: "1.5rem",
};

const cardStyle = {
  background: "rgba(255, 255, 255, 0.06)",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  padding: "1.25rem",
};

const tabBarStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const tabLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.5rem 1rem",
  borderRadius: "999px",
  border: "1px solid rgba(255, 255, 255, 0.22)",
  color: "inherit",
  textDecoration: "none",
  fontWeight: 600,
  letterSpacing: "0.02em",
  background: "transparent",
};

const activeTabLinkStyle = {
  ...tabLinkStyle,
  background: "rgba(37, 237, 39, 0.18)",
  border: "1px solid rgba(37, 237, 39, 0.6)",
  color: "#d5ffd6",
};

const statValueStyle = {
  fontSize: "1.7rem",
  fontWeight: 600,
};

const statLabelStyle = {
  fontSize: "0.9rem",
  color: "rgba(242, 244, 247, 0.7)",
};

const listStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "0.75rem",
  marginTop: "1rem",
};

const subtleLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.5rem 0.95rem",
  borderRadius: "999px",
  border: "1px solid rgba(255, 255, 255, 0.25)",
  color: "inherit",
  textDecoration: "none",
  fontWeight: 500,
};

function StatItem({ value, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <span style={statValueStyle}>{value}</span>
      <span style={statLabelStyle}>{label}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAdmin, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    setStatus("loading");
    setError("");

    fetchAdminStats()
      .then((data) => {
        if (!isMounted) return;
        setStats(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load admin stats");
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const userStats = useMemo(() => stats?.users ?? {}, [stats]);
  const libraryStats = useMemo(() => stats?.library ?? {}, [stats]);
  const styleOrder = ["Latin", "Standard", "Smooth", "Rhythm"];
  const styleCounts = useMemo(() => {
    const styles = libraryStats.styles ?? {};
    const ordered = styleOrder.map((label) => [label, styles[label] ?? 0]);
    const extras = Object.entries(styles).filter(([label]) => !styleOrder.includes(label));
    return [...ordered, ...extras];
  }, [libraryStats.styles]);
  const styleDanceCounts = useMemo(() => libraryStats.styleDances ?? {}, [libraryStats.styleDances]);

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "1.6rem", fontWeight: 600 }}>Admin Portal</span>
            <span style={{ fontSize: "0.9rem", color: "rgba(242, 244, 247, 0.7)" }}>
              Signed in as {user?.displayName || user?.email || "Admin"}
            </span>
          </div>
          <nav style={tabBarStyle} aria-label="Admin sections">
            <Link to="/admin" style={activeTabLinkStyle}>
              Dashboard
            </Link>
            <Link to="/admin/library" style={tabLinkStyle}>
              Music
            </Link>
            <Link to="/admin/users" style={tabLinkStyle}>
              Users
            </Link>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to="/" style={subtleLinkStyle}>
            Back to Player
          </Link>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              background: "#e05555",
              border: "none",
              color: "#10141b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
        {!isAdmin ? (
          <div style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Admin access required</h2>
            <p style={{ margin: "0.75rem 0 0", color: "rgba(242, 244, 247, 0.7)" }}>
              You do not have permission to view the admin dashboard.
            </p>
          </div>
        ) : (
          <>
            <section style={cardStyle}>
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>User stats</h2>
              <div style={cardGridStyle}>
                <StatItem value={userStats.totalUsers ?? "--"} label="Total users" />
                <StatItem value={userStats.adminUsers ?? "--"} label="Admin accounts" />
                <StatItem value={userStats.usersWithEmail ?? "--"} label="Users with email" />
              </div>
              {status === "loading" ? (
                <p style={{ marginTop: "1rem", color: "rgba(242, 244, 247, 0.7)" }}>
                  Loading user stats...
                </p>
              ) : null}
              {status === "error" ? (
                <p style={{ marginTop: "1rem", color: "#f5a3a3" }}>{error}</p>
              ) : null}
            </section>

            <section style={cardStyle}>
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Music library stats</h2>
              <div style={cardGridStyle}>
                <StatItem value={libraryStats.totalSongs ?? "--"} label="Total songs" />
              </div>
              <div style={listStyle}>
                {styleCounts.map(([label, count]) => (
                  <div
                    key={label}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{count}</div>
                    <div style={statLabelStyle}>{label}</div>
                  </div>
                ))}
              </div>
              {styleCounts.length ? (
                <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
                  {styleCounts.map(([styleLabel]) => {
                    const danceMap = styleDanceCounts[styleLabel] || {};
                    const dances = Object.entries(danceMap).sort(
                      (a, b) => Number(b[1] || 0) - Number(a[1] || 0)
                    );
                    return (
                      <div
                        key={styleLabel}
                        style={{
                          padding: "1rem",
                          borderRadius: "14px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                        }}
                      >
                        <div style={{ fontSize: "1rem", fontWeight: 600 }}>{styleLabel}</div>
                        <div style={listStyle}>
                          {dances.map(([danceLabel, count]) => (
                            <div
                              key={`${styleLabel}-${danceLabel}`}
                              style={{
                                padding: "0.75rem",
                                borderRadius: "12px",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                              }}
                            >
                              <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>{count}</div>
                              <div style={statLabelStyle}>{danceLabel}</div>
                            </div>
                          ))}
                          {!dances.length ? (
                            <div style={{ color: "rgba(242, 244, 247, 0.6)" }}>
                              No songs found.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {status === "loading" ? (
                <p style={{ marginTop: "1rem", color: "rgba(242, 244, 247, 0.7)" }}>
                  Loading library stats...
                </p>
              ) : null}
            </section>

          </>
        )}
      </main>
    </div>
  );
}
