const API_ORIGIN = import.meta.env.VITE_API_ORIGIN?.trim();

export function withApiOrigin(path) {
  if (!path) return path;
  if (!API_ORIGIN) return path;
  try {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return new URL(normalizedPath, API_ORIGIN).toString();
  } catch (err) {
    console.warn("Invalid API_ORIGIN or path", err);
    return path;
  }
}

export async function fetchWithOrigin(input, init) {
  const url = typeof input === "string" ? withApiOrigin(input) : input;
  return fetch(url, init);
}
