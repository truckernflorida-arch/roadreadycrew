// Cloudflare Pages Function: handles POST /api/driver, /api/carrier, /api/referral
// Stores each submission in a D1 database bound as `DB` (see README.md and schema.sql).
// If DB isn't bound yet it returns 503, and the site shows its friendly "email us" fallback.

const FORMS = new Set(["driver", "carrier", "referral"]);
const REQUIRED = {
  driver: ["full_name", "phone", "email", "zip", "tcpa_consent", "english_proficiency", "us_cdl_work_auth"],
  carrier: ["company_name", "contact_name", "phone", "email", "mc_dot", "positions_needed", "hiring_areas"],
  referral: ["your_name", "your_phone"],
};
// Never store these even if someone types them into a notes field name.
const BLOCKED_KEYS = ["ssn", "social", "dob", "date_of_birth", "license_number", "cdl_number"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function onRequestPost({ request, params, env }) {
  const form = String(params.form || "");
  if (!FORMS.has(form)) return json({ ok: false, error: "unknown form" }, 404);

  let data;
  try {
    const type = request.headers.get("content-type") || "";
    data = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: "bad body" }, 400);
  }
  if (data.company_website) return json({ ok: true }); // honeypot hit: pretend success

  for (const k of REQUIRED[form]) {
    if (!data[k] || String(data[k]).trim() === "") return json({ ok: false, error: `missing ${k}` }, 422);
  }
  for (const k of Object.keys(data)) {
    if (BLOCKED_KEYS.some((b) => k.toLowerCase().includes(b))) delete data[k];
  }
  const raw = JSON.stringify(data);
  if (raw.length > 20000) return json({ ok: false, error: "too large" }, 413);

  if (!env.DB) return json({ ok: false, error: "storage not configured" }, 503);

  const ip = request.headers.get("cf-connecting-ip") || "";
  const ua = (request.headers.get("user-agent") || "").slice(0, 300);
  // Keep proof of TCPA consent: timestamp, IP, user agent and the exact consent text shown.
  const consentText = data.tcpa_consent || data.referrer_sms_consent
    ? "I agree Road Ready Crew may call or text me at this number about trucking jobs, including by automated means. Consent isn't a condition of service. Msg & data rates may apply. Reply STOP to opt out."
    : null;

  await env.DB.prepare(
    "INSERT INTO submissions (form, created_at, ip, user_agent, consent_text, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  ).bind(form, new Date().toISOString(), ip, ua, consentText, raw).run();

  // Optional: ping a webhook (Slack/Discord/Zapier/Make) so you see new leads right away.
  if (env.NOTIFY_WEBHOOK) {
    const who = data.full_name || data.contact_name || data.your_name || "someone";
    const text = `New ${form} form from ${who} (${data.phone || data.your_phone || ""})`;
    try { await fetch(env.NOTIFY_WEBHOOK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, content: text }) }); } catch {}
  }
  return json({ ok: true });
}

export const onRequest = () => json({ ok: false, error: "POST only" }, 405);
