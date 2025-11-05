import { fetchWithOrigin } from "../utils/apiClient.js";

export async function fetchStorageFiles({ prefix } = {}) {
  const params = new URLSearchParams();
  if (prefix) {
    params.set("prefix", prefix);
  }

  const search = params.toString();
  const response = await fetchWithOrigin(
    `/api/admin/storage-files${search ? `?${search}` : ""}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    }
  );

  if (response.status === 304) {
    return [];
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch storage files");
  }

  const rawText = await response.text();
  console.debug("[storageService] raw response", rawText.slice(0, 200));
  let data;
  try {
    data = rawText ? JSON.parse(rawText) : { files: [] };
  } catch (err) {
    console.error("Failed to parse storage files response", err, rawText);
    throw err;
  }

  if (!data || !Array.isArray(data.files)) {
    console.warn("[storageService] files not array", data);
    return [];
  }

  console.debug("[storageService] parsed files", data.files.length);

  return data.files.map((file) => ({
    ...file,
    filename: file.filename ?? file.path,
    durationMs:
      typeof file.durationMs === "number" && Number.isFinite(file.durationMs)
        ? file.durationMs
        : null,
  }));
}

export async function uploadSongFile({
  styleId,
  danceId,
  fileBase64,
  fileName,
  contentType,
  metadata,
  overwrite = false,
}) {
  const payload = {
    styleId,
    danceId,
    fileBase64,
    fileName,
    contentType,
    metadata,
    overwrite,
  };

  const response = await fetchWithOrigin("/api/admin/storage-upload", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Failed to upload song";
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data || typeof data !== "object") {
    throw new Error("Upload succeeded but response was empty");
  }
  return data;
}
