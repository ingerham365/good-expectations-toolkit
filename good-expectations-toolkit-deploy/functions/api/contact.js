/**
 * Cloudflare Pages Function
 * POST /api/contact
 *
 * Receives the contact form JSON payload from js/main.js (fields: name,
 * email, topic, message, plus honeypot company_website) and forwards it
 * as an email via the Resend API (https://resend.com). Swap the RESEND_*
 * logic for any other provider (Mailchannels, Postmark, SendGrid, etc.)
 * or a storage call (KV, D1) — the request/response contract with the
 * front end only needs a JSON 2xx response on success.
 *
 * Required environment variables/secrets (set in the Cloudflare Pages
 * dashboard under Settings > Environment variables, or via
 * `wrangler pages secret put`):
 *   RESEND_API_KEY   - API key for https://resend.com (or remove this
 *                       integration entirely and just log/store instead)
 *   CONTACT_TO_EMAIL - address that should receive form submissions
 *   CONTACT_FROM_EMAIL - verified "from" address in your Resend domain
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 5000;

function jsonResponse(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign(
      {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      extraHeaders || {}
    )
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function onRequestOptions() {
  return jsonResponse({ ok: true }, 204);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  // Honeypot: bots that fill hidden fields get a fake success, no email sent.
  if (payload.company_website) {
    return jsonResponse({ ok: true }, 200);
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const topic = String(payload.topic || "General").trim();
  const message = String(payload.message || "").trim();

  if (!name || !email || !message) {
    return jsonResponse({ ok: false, error: "Name, email and message are required." }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ ok: false, error: "Enter a valid email address." }, 400);
  }
  if (
    name.length > MAX_FIELD_LENGTH ||
    email.length > MAX_FIELD_LENGTH ||
    topic.length > MAX_FIELD_LENGTH ||
    message.length > MAX_FIELD_LENGTH
  ) {
    return jsonResponse({ ok: false, error: "One of the fields is too long." }, 400);
  }

  // If no email provider is configured yet, accept the submission so the
  // front end still works end-to-end during initial setup/testing.
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    console.log("Contact form submission (no email provider configured):", {
      name,
      email,
      topic,
      message
    });
    return jsonResponse({ ok: true, note: "Received (email delivery not yet configured)." }, 200);
  }

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: env.CONTACT_TO_EMAIL,
        reply_to: email,
        subject: `[Good Expectations Toolkit] ${topic} — ${name}`,
        html: `
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `
      })
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend API error:", resendResponse.status, errText);
      return jsonResponse({ ok: false, error: "Could not send message right now." }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("Contact function error:", err);
    return jsonResponse({ ok: false, error: "Unexpected server error." }, 500);
  }
}
