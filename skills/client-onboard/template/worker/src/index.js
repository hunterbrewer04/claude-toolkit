/**
 * Cloudflare Worker -- POST /api/contact
 *
 * Handles the {{CLIENT_NAME}} contact form. Deployed as a standalone Worker
 * and bound to a Workers Route on {{DOMAIN}}/api/contact (set this up once
 * in the Cloudflare dashboard -- wrangler deploy does not create the route
 * binding for you) so the site's own fetch() call needs no CORS handling.
 *
 * Required bindings (set in the Cloudflare dashboard or wrangler.toml):
 *   SEND_EMAIL  -- send_email binding (Cloudflare Email Routing)
 *   TO_EMAIL    -- destination address (environment variable / secret)
 *
 * One-time Cloudflare setup before this works end to end:
 *   1. Enable Email Routing for {{DOMAIN}}.
 *   2. Add noreply@{{DOMAIN}} as a Custom Address routing to TO_EMAIL.
 *   3. wrangler deploy (from this worker/ directory).
 *   4. Bind a Workers Route: {{DOMAIN}}/api/contact -> this Worker.
 */

import { EmailMessage } from "cloudflare:email";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRawEmail({ from, to, replyTo, subject, body }) {
  const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageId = `<${crypto.randomUUID()}@{{DOMAIN}}>`;

  const lines = [
    `MIME-Version: 1.0`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: ${messageId}`,
    `From: {{CLIENT_NAME}} Website <${from}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subjectEncoded}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    encodeQuotedPrintable(body),
  ];

  return lines.join("\r\n");
}

function encodeQuotedPrintable(str) {
  const encoder = new TextEncoder();
  let encoded = "";
  let pendingWhitespace = "";

  for (const char of str) {
    const code = char.codePointAt(0);
    if (char === "\r" || char === "\n") {
      for (const ws of pendingWhitespace) {
        encoded += ws === " " ? "=20" : "=09";
      }
      pendingWhitespace = "";
      if (char === "\n") encoded += "\r\n";
    } else if (char === " " || char === "\t") {
      pendingWhitespace += char;
    } else {
      encoded += pendingWhitespace;
      pendingWhitespace = "";
      if (char === "\t" || (code >= 33 && code <= 126 && char !== "=")) {
        encoded += char;
      } else if (code <= 127) {
        encoded += `=${code.toString(16).toUpperCase().padStart(2, "0")}`;
      } else {
        const bytes = encoder.encode(char);
        for (const byte of bytes) {
          encoded += `=${byte.toString(16).toUpperCase().padStart(2, "0")}`;
        }
      }
    }
  }

  for (const ws of pendingWhitespace) {
    encoded += ws === " " ? "=20" : "=09";
  }

  const lines = encoded.split("\r\n");
  const wrapped = lines.map((line) => {
    const chunks = [];
    while (line.length > 76) {
      let cutAt = 75;
      if (line[cutAt - 1] === "=") cutAt -= 1;
      else if (line[cutAt - 2] === "=") cutAt -= 2;
      chunks.push(line.slice(0, cutAt) + "=");
      line = line.slice(cutAt);
    }
    chunks.push(line);
    return chunks.join("\r\n");
  });

  return wrapped.join("\r\n");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Worker handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Allow": "POST" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    const { name, phone, email, message } = body ?? {};

    if (
      typeof name !== "string" || !name.trim() ||
      typeof phone !== "string" || !phone.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof message !== "string" || !message.trim()
    ) {
      return jsonResponse({ success: false, error: "All fields are required" }, 400);
    }

    if (name.length > 200)    return jsonResponse({ success: false, error: "Name is too long" }, 400);
    if (phone.length > 30)    return jsonResponse({ success: false, error: "Phone number is too long" }, 400);
    if (email.length > 254)   return jsonResponse({ success: false, error: "Email address is too long" }, 400);
    if (message.length > 5000) return jsonResponse({ success: false, error: "Message is too long (max 5000 characters)" }, 400);

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(email)) {
      return jsonResponse({ success: false, error: "Invalid email address" }, 400);
    }

    const FROM    = "noreply@{{DOMAIN}}";
    const SUBJECT = "New Contact Form Submission — {{CLIENT_NAME}}";

    const bodyText = [
      "New message submitted via the {{CLIENT_NAME}} website contact form.",
      "",
      `Name:    ${name.trim()}`,
      `Phone:   ${phone.trim()}`,
      `Email:   ${email.trim()}`,
      "",
      "Message:",
      message.trim(),
    ].join("\r\n");

    const rawEmail = buildRawEmail({
      from:    FROM,
      to:      env.TO_EMAIL,
      replyTo: email.trim(),
      subject: SUBJECT,
      body:    bodyText,
    });

    const emailMessage = new EmailMessage(FROM, env.TO_EMAIL, rawEmail);

    try {
      await env.SEND_EMAIL.send(emailMessage);
    } catch (err) {
      console.error("Email send failed:", err);
      return jsonResponse({ success: false, error: "Failed to send message. Please try again or call us directly." }, 500);
    }

    return jsonResponse({ success: true });
  },
};
