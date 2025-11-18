import { fetchWithOrigin } from "../utils/apiClient.js";

export async function listSongs() {
  const response = await fetchWithOrigin("/api/admin/songs", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load songs");
  }

  const data = await response.json();
  return Array.isArray(data?.songs) ? data.songs : [];
}

export async function createSong(payload) {
  const response = await fetchWithOrigin("/api/admin/songs", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to create song");
  }

  const data = await response.json();
  return data?.song ?? null;
}

export async function upsertSong(id, payload) {
  const response = await fetchWithOrigin("/api/admin/songs", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, ...payload }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to update song");
  }

  const data = await response.json();
  return data?.song ?? null;
}

export async function removeSong(id) {
  if (!id) return;
  const response = await fetchWithOrigin(`/api/admin/songs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || "Failed to delete song");
  }
}

export async function getSongPlaybackUrl(storagePath) {
  if (!storagePath || typeof storagePath !== "string") {
    throw new Error("storagePath is required");
  }

  const params = new URLSearchParams();
  params.set("storagePath", storagePath);

  const response = await fetchWithOrigin(`/api/admin/song-url?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load playback URL");
  }

  const data = await response.json();
  if (!data || typeof data.url !== "string" || !data.url.trim()) {
    throw new Error("Playback URL not available");
  }

  return data.url;
}
