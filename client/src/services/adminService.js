import { fetchWithOrigin } from "../utils/apiClient.js";

export async function fetchAdminStats() {
  const response = await fetchWithOrigin("/api/admin/stats", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load admin stats");
  }

  return response.json();
}

export async function fetchAdminUsers({ limit = 200, pageToken } = {}) {
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  if (pageToken) {
    params.set("pageToken", pageToken);
  }
  const response = await fetchWithOrigin(`/api/admin/users?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load users");
  }

  return response.json();
}
