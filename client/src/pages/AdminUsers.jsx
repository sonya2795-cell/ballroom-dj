import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { deleteAdminUser, fetchAdminUsers } from "../services/adminService.js";

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

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const cellStyle = {
  padding: "0.75rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  textAlign: "left",
  verticalAlign: "top",
  fontSize: "0.9rem",
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

const filterRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
  alignItems: "center",
};

const inputStyle = {
  padding: "0.55rem 0.75rem",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  background: "rgba(8, 10, 14, 0.8)",
  color: "inherit",
  minWidth: "220px",
};

const selectStyle = {
  padding: "0.55rem 0.75rem",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  background: "rgba(8, 10, 14, 0.8)",
  color: "inherit",
};

const sortButtonStyle = {
  background: "transparent",
  border: "none",
  color: "inherit",
  font: "inherit",
  padding: 0,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
};

function splitName(displayName) {
  if (!displayName) {
    return { firstName: "--", lastName: "--" };
  }
  const parts = displayName.trim().split(/\s+/);
  const firstName = parts[0] || "--";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "--";
  return { firstName, lastName };
}

function formatDateTime(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(parsed);
}

export default function AdminUsers() {
  const { user, isAdmin, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortKey, setSortKey] = useState("lastSignInTime");
  const [sortDirection, setSortDirection] = useState("desc");
  const [deletingUid, setDeletingUid] = useState(null);

  const loadUsers = useCallback(
    async (options = {}) => {
      if (!isAdmin) return;
      setStatus("loading");
      setError("");
      try {
        const data = await fetchAdminUsers(options);
        const incoming = Array.isArray(data?.users) ? data.users : [];
        setUsers((prev) => (options.pageToken ? [...prev, ...incoming] : incoming));
        setNextPageToken(data?.nextPageToken ?? null);
        setStatus("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
        setStatus("error");
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const adminCount = useMemo(
    () => users.filter((entry) => entry?.customClaims?.role === "admin").length,
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((entry) => {
      if (roleFilter === "admin" && entry?.customClaims?.role !== "admin") {
        return false;
      }
      if (roleFilter === "user" && entry?.customClaims?.role === "admin") {
        return false;
      }
      if (!query) return true;
      const haystack = [
        entry?.displayName,
        entry?.email,
        entry?.uid,
        ...(Array.isArray(entry?.providers) ? entry.providers : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [roleFilter, searchQuery, users]);

  const sortedUsers = useMemo(() => {
    const normalize = (value) => {
      if (value === null || typeof value === "undefined") return "";
      return String(value).toLowerCase();
    };

    const getFieldValue = (entry, key) => {
      switch (key) {
        case "firstName":
          return splitName(entry.displayName).firstName;
        case "lastName":
          return splitName(entry.displayName).lastName;
        case "email":
          return entry.email || "";
        case "providers":
          return Array.isArray(entry.providers) ? entry.providers.join(", ") : "";
        case "role":
          return entry.customClaims?.role || "user";
        case "created":
          return entry.creationTime || "";
        case "lastSignIn":
          return entry.lastSignInTime || "";
        default:
          return "";
      }
    };

    const compare = (a, b) => {
      const aValue = getFieldValue(a, sortKey);
      const bValue = getFieldValue(b, sortKey);
      if (sortKey === "created" || sortKey === "lastSignIn") {
        const aTime = aValue ? Date.parse(aValue) : 0;
        const bTime = bValue ? Date.parse(bValue) : 0;
        return aTime - bTime;
      }
      return normalize(aValue).localeCompare(normalize(bValue));
    };

    const sorted = [...filteredUsers].sort(compare);
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredUsers, sortDirection, sortKey]);

  const handleSort = useCallback(
    (key) => {
      setSortKey((prevKey) => {
        if (prevKey === key) {
          setSortDirection((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
          return prevKey;
        }
        setSortDirection(key === "created" || key === "lastSignIn" ? "desc" : "asc");
        return key;
      });
    },
    []
  );

  const renderSortLabel = (key, label) => {
    const isActive = sortKey === key;
    const arrow = isActive ? (sortDirection === "asc" ? "▲" : "▼") : "";
    return (
      <button type="button" onClick={() => handleSort(key)} style={sortButtonStyle}>
        <span>{label}</span>
        <span aria-hidden="true">{arrow}</span>
      </button>
    );
  };

  const handleDeleteUser = useCallback(
    async (entry) => {
      if (!entry?.uid) return;
      if (entry.uid === user?.uid) {
        setError("You cannot delete your own account.");
        return;
      }
      const confirmed = window.confirm(
        `Delete account for ${entry.email || entry.uid}? This cannot be undone.`
      );
      if (!confirmed) return;

      setDeletingUid(entry.uid);
      setError("");
      try {
        await deleteAdminUser(entry.uid);
        setUsers((prev) => prev.filter((item) => item.uid !== entry.uid));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete user");
      } finally {
        setDeletingUid(null);
      }
    },
    [user?.uid]
  );

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "1.6rem", fontWeight: 600 }}>User Library</span>
            <span style={{ fontSize: "0.9rem", color: "rgba(242, 244, 247, 0.7)" }}>
              Signed in as {user?.displayName || user?.email || "Admin"}
            </span>
          </div>
          <nav style={tabBarStyle} aria-label="Admin sections">
            <Link to="/admin" style={tabLinkStyle}>
              Dashboard
            </Link>
            <Link to="/admin/library" style={tabLinkStyle}>
              Music
            </Link>
            <Link to="/admin/users" style={activeTabLinkStyle}>
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

      <main style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {!isAdmin ? (
          <div style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Admin access required</h2>
            <p style={{ margin: "0.75rem 0 0", color: "rgba(242, 244, 247, 0.7)" }}>
              You do not have permission to view the user library.
            </p>
          </div>
        ) : (
          <>
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.2rem" }}>User stats</h2>
                  <p style={{ margin: "0.4rem 0 0", color: "rgba(242, 244, 247, 0.7)" }}>
                    {users.length} total, {adminCount} admins
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadUsers()}
                  disabled={status === "loading"}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "999px",
                    background:
                      status === "loading" ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.18)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    color: "inherit",
                    cursor: status === "loading" ? "default" : "pointer",
                    fontWeight: 500,
                  }}
                >
                  {status === "loading" ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <div style={{ marginTop: "1rem", ...filterRowStyle }}>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name, email, uid, provider"
                  style={inputStyle}
                />
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  style={selectStyle}
                >
                  <option value="all">All roles</option>
                  <option value="user">Users only</option>
                  <option value="admin">Admins only</option>
                </select>
                <div style={{ color: "rgba(242, 244, 247, 0.7)", fontSize: "0.9rem" }}>
                  Showing {filteredUsers.length} results
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              {status === "error" ? (
                <p style={{ margin: 0, color: "#f5a3a3" }}>{error}</p>
              ) : null}
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={cellStyle}>{renderSortLabel("firstName", "First name")}</th>
                      <th style={cellStyle}>{renderSortLabel("lastName", "Last name")}</th>
                      <th style={cellStyle}>{renderSortLabel("email", "Email")}</th>
                      <th style={cellStyle}>{renderSortLabel("providers", "Providers")}</th>
                      <th style={cellStyle}>{renderSortLabel("role", "Role")}</th>
                      <th style={cellStyle}>{renderSortLabel("created", "Created")}</th>
                      <th style={cellStyle}>{renderSortLabel("lastSignIn", "Last sign-in")}</th>
                      <th style={cellStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((entry) => {
                      const { firstName, lastName } = splitName(entry.displayName);
                      const isDeleting = deletingUid === entry.uid;
                      const isSelf = entry.uid === user?.uid;
                      return (
                        <tr key={entry.uid}>
                          <td style={cellStyle}>
                            <div style={{ fontWeight: 600 }}>{firstName}</div>
                          </td>
                          <td style={cellStyle}>
                            <div style={{ fontWeight: 600 }}>{lastName}</div>
                          </td>
                          <td style={cellStyle}>{entry.email || "--"}</td>
                          <td style={cellStyle}>
                            {Array.isArray(entry.providers) && entry.providers.length
                              ? entry.providers.join(", ")
                              : "--"}
                          </td>
                          <td style={cellStyle}>{entry.customClaims?.role || "user"}</td>
                          <td style={cellStyle}>{formatDateTime(entry.creationTime)}</td>
                          <td style={cellStyle}>{formatDateTime(entry.lastSignInTime)}</td>
                          <td style={cellStyle}>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(entry)}
                              disabled={isDeleting || isSelf}
                              style={{
                                padding: "0.35rem 0.7rem",
                                borderRadius: "999px",
                                background: isSelf ? "rgba(255,255,255,0.1)" : "#e05555",
                                border: "none",
                                color: isSelf ? "rgba(255,255,255,0.6)" : "#10141b",
                                fontWeight: 600,
                                cursor: isSelf ? "not-allowed" : "pointer",
                              }}
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {status === "loading" ? (
                <p style={{ marginTop: "1rem", color: "rgba(242, 244, 247, 0.7)" }}>
                  Loading users...
                </p>
              ) : null}
              {!status.includes("loading") && filteredUsers.length === 0 ? (
                <p style={{ marginTop: "1rem", color: "rgba(242, 244, 247, 0.7)" }}>
                  No users found yet.
                </p>
              ) : null}
              {nextPageToken ? (
                <div style={{ marginTop: "1.25rem" }}>
                  <button
                    type="button"
                    onClick={() => loadUsers({ pageToken: nextPageToken })}
                    disabled={status === "loading"}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: "999px",
                      background: "rgba(255, 255, 255, 0.18)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      color: "inherit",
                      cursor: status === "loading" ? "default" : "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Load more
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
