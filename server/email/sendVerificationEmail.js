const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function getFromAddress() {
  return (
    process.env.AUTH_VERIFICATION_FROM?.trim() ||
    process.env.FEEDBACK_FROM?.trim() ||
    "no-reply@muzonapp.com"
  );
}

async function sendVerificationEmail({ to, verifyLink, token }) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be configured for verification emails");
  }
  if (!to || !verifyLink || !token) {
    throw new Error("Missing email verification payload");
  }

  const escapedLink = escapeHtml(verifyLink);
  const escapedToken = escapeHtml(token);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Verify your email</h2>
      <p>Click the button below to verify your email address and continue signup.</p>
      <p><a href="${escapedLink}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Verify email</a></p>
      <p>If the button doesn't work, paste this verification code on the site:</p>
      <p style="font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">${escapedToken}</p>
      <p>This link expires in 10 minutes and can be used once.</p>
    </div>
  `;

  const payload = {
    from: getFromAddress(),
    to,
    subject: "Verify your email for Muzon",
    html,
    text: `Verify your email\n\nOpen this link: ${verifyLink}\n\nOr paste this code: ${token}\n\nThis link expires in 10 minutes and can be used once.`,
  };

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorText || "Unknown error"}`);
  }
}

module.exports = { sendVerificationEmail };
