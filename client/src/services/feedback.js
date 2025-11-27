import { fetchWithOrigin } from "../utils/apiClient.js";

/**
 * Submit feedback to the backend email endpoint.
 * @param {Object} params
 * @param {string} params.description - Required bug description supplied by the user.
 * @param {string} [params.contactEmail] - Optional email when the user is anonymous.
 * @param {File[]} [params.files] - Optional screenshot uploads.
 * @param {Record<string, string>} [params.metadata] - Extra context (page URL, user agent, etc).
 */
export async function submitFeedback({
  description,
  contactEmail,
  files = [],
  metadata = {},
} = {}) {
  const normalizedDescription =
    typeof description === "string" ? description.trim() : "";

  if (!normalizedDescription) {
    throw new Error("Please describe the bug you encountered.");
  }

  const formData = new FormData();
  formData.set("description", normalizedDescription);

  if (typeof contactEmail === "string" && contactEmail.trim()) {
    formData.set("contactEmail", contactEmail.trim());
  }

  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (value === null || typeof value === "undefined") return;
    const normalizedKey = String(key).trim();
    if (!normalizedKey) return;
    formData.set(normalizedKey, String(value));
  });

  files
    .filter((file) => file instanceof File || file instanceof Blob)
    .forEach((file) => {
      formData.append("screenshots", file);
    });

  const response = await fetchWithOrigin("/api/feedback/email", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let message = "Unable to send feedback right now.";
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  const result = await response.json().catch(() => ({}));
  return result ?? {};
}
