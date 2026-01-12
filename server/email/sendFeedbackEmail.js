const nodemailer = require("nodemailer");

let transporter;
const RESEND_API_URL = "https://api.resend.com/emails";

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

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

function getRecipients() {
  const recipients = (process.env.FEEDBACK_RECIPIENTS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return recipients;
}

function getFromAddress() {
  return process.env.FEEDBACK_FROM?.trim() || process.env.SMTP_USER?.trim() || "no-reply@ballroom-dj.app";
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  const username = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASS;
  const secure = toBool(process.env.SMTP_SECURE, port === 465);

  if (!host || !port) {
    console.error("SMTP transport misconfigured", {
      hasHost: Boolean(host),
      port: Number.isFinite(port) ? port : null,
      hasUser: Boolean(username),
      hasPass: Boolean(password),
      secure,
    });
    throw new Error("SMTP_HOST and SMTP_PORT must be configured");
  }

  const auth =
    username && password
      ? {
          user: username,
          pass: password,
        }
      : undefined;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
  });

  transporter.verify((err) => {
    if (err) {
      console.error("SMTP verification failed", {
        message: err?.message,
        name: err?.name,
        code: err?.code,
        response: err?.response,
        responseCode: err?.responseCode,
        stack: err?.stack,
      });
      return;
    }
    console.log("SMTP transport verified");
  });

  return transporter;
}

function buildAttachmentPayload(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  return attachments
    .filter((item) => item && item.content && item.filename)
    .map((item, index) => ({
      filename: item.filename || `screenshot-${index + 1}.png`,
      content: item.content,
      cid: item.cid,
      contentType: item.contentType || "application/octet-stream",
    }));
}

function buildResendAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return undefined;
  }

  const payload = attachments
    .filter((item) => item && item.content && item.filename)
    .map((item, index) => ({
      filename: item.filename || `screenshot-${index + 1}.png`,
      content: item.content.toString("base64"),
      content_type: item.contentType || "application/octet-stream",
    }));

  return payload.length > 0 ? payload : undefined;
}

function buildHtmlBody({ description, user, contactEmail, metadata, sentAt }) {
  const summaryRows = [
    { label: "Reporter UID", value: user?.uid || "anonymous" },
    { label: "Reporter name", value: user?.displayName || "n/a" },
    { label: "Reporter email", value: user?.email || contactEmail || "n/a" },
    { label: "Page URL", value: metadata?.pageUrl || "n/a" },
    { label: "User agent", value: metadata?.userAgent || "n/a" },
    { label: "Platform", value: metadata?.platform || "n/a" },
    { label: "Timezone", value: metadata?.timezone || "n/a" },
    { label: "App version", value: metadata?.appVersion || "n/a" },
    { label: "IP address", value: metadata?.ipAddress || "n/a" },
  ];

  const summaryTable = summaryRows
    .map(
      ({ label, value }) =>
        `<tr><td style="padding:4px 8px;font-weight:600;">${escapeHtml(label)}</td><td style="padding:4px 8px;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const safeDescription = escapeHtml(description);

  return `
    <div style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f141b;">
      <h2 style="margin-bottom: 0.5rem;">New feedback received</h2>
      <p style="white-space: pre-wrap; background:#f4f6f8; padding:12px 16px; border-radius:8px;">
        ${safeDescription}
      </p>
      <table style="margin-top: 1rem; border-collapse: collapse;">${summaryTable}</table>
      <p style="margin-top: 1rem; font-size: 0.85rem; color: #555;">Sent at ${sentAt}</p>
    </div>
  `;
}

function buildTextBody({ description, user, contactEmail, metadata, sentAt }) {
  const lines = [
    "New feedback received:",
    "",
    description,
    "",
    "-----",
    `Reporter UID: ${user?.uid || "anonymous"}`,
    `Reporter name: ${user?.displayName || "n/a"}`,
    `Reporter email: ${user?.email || contactEmail || "n/a"}`,
    `Page URL: ${metadata?.pageUrl || "n/a"}`,
    `User agent: ${metadata?.userAgent || "n/a"}`,
    `Platform: ${metadata?.platform || "n/a"}`,
    `Timezone: ${metadata?.timezone || "n/a"}`,
    `App version: ${metadata?.appVersion || "n/a"}`,
    `IP address: ${metadata?.ipAddress || "n/a"}`,
    "",
    `Sent at ${sentAt}`,
  ];

  return lines.join("\n");
}

async function sendViaResend({ apiKey, mailOptions, contactEmail, attachments }) {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be configured");
  }

  const payload = {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    text: mailOptions.text,
    html: mailOptions.html,
    attachments: buildResendAttachments(attachments),
  };

  if (contactEmail) {
    payload.reply_to = contactEmail;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Resend API error (${response.status}): ${errorText || "Unknown error"}`);
  }
}

async function sendFeedbackEmail({ description, user, contactEmail, metadata = {}, attachments = [] }) {
  if (!description) {
    throw new Error("Feedback description is required");
  }

  const recipients = getRecipients();

  if (recipients.length === 0) {
    throw new Error("FEEDBACK_RECIPIENTS must list at least one email address");
  }

  const timestamp = new Date();
  const sentAt = timestamp.toISOString();
  const readableTimestamp = timestamp.toLocaleString();

  const mailOptions = {
    from: getFromAddress(),
    to: recipients,
    subject: `[Feedback] ${user?.email || contactEmail || "anonymous"} - ${readableTimestamp}`,
    text: buildTextBody({ description, user, contactEmail, metadata, sentAt }),
    html: buildHtmlBody({ description, user, contactEmail, metadata, sentAt }),
    attachments: buildAttachmentPayload(attachments),
  };

  const resendApiKey = getResendApiKey();
  if (resendApiKey) {
    await sendViaResend({
      apiKey: resendApiKey,
      mailOptions,
      contactEmail,
      attachments,
    });
    return;
  }

  const mailTransporter = getTransporter();
  await mailTransporter.sendMail(mailOptions);
}

module.exports = {
  sendFeedbackEmail,
};
