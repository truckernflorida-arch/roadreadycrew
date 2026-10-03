# Road Ready Crew: website draft

Static site for **Road Ready Crew LLC**, a trucker-run CDL-A driver recruiting agency.
Drivers never pay; carriers pay per hire. Future domain: `roadreadycrew.com` (not bought yet).

Plain HTML + one CSS file + one small JS file. No framework, no build step. Open `index.html`
in a browser or serve the folder with any static host.

## Files

| Path | What it is |
|---|---|
| `index.html` | Homepage: hero, how it works, why us, route types, carrier teaser, pay-per-mile calculator, refer-a-driver, FAQ, CTA |
| `drivers.html` | Driver application form (posts to `/api/driver`). Reads `?ref=CODE` for referral credit |
| `carriers.html` | Pay-per-hire model, screening, what the carrier controls, carrier inquiry form (posts to `/api/carrier`) |
| `privacy.html` | Plain-English privacy & SMS policy. **Draft. Not legal advice. Have a lawyer review before launch** |
| `404.html` | Not-found page |
| `styles.css` | All styles (mobile-first, dark asphalt + safety orange / highway yellow) |
| `main.js` | Mobile nav, scroll reveal, form submit + fallback, referral links, pay calculator |
| `favicon.svg`, `img/apple-touch-icon.png`, `img/og.png` | Icons + 1200x630 social share image |
| `img/*-fallback.svg` | Built-in SVG artwork. See `img/IMAGES.md` to drop in real photos/AI images |
| `fonts/` | Self-hosted Barlow Condensed (SIL Open Font License) |
| `functions/api/[form].js` | Cloudflare Pages Function that stores form posts in D1 |
| `schema.sql` | D1 table for submissions |
| `_headers`, `robots.txt`, `sitemap.xml`, `.nojekyll` | Hosting extras |

## Before launch: placeholders to fill in

- **Phone:** search for `Phone: coming soon` (footer + privacy page) and set `CONTACT_PHONE` at the top of `main.js` once the Google Voice number exists.
- **Email:** `hello@roadreadycrew.com` is used everywhere. Set it up (for example Cloudflare Email Routing to your Gmail) once you own the domain.
- **Social:** TikTok / Facebook / YouTube links point to `@roadreadycrew`. Grab those handles or change the links (in every page footer).
- **Referral bonus amount:** says "TBD" on the homepage.
- **Domain:** canonical/OG URLs, `robots.txt` and `sitemap.xml` use `https://roadreadycrew.com`.
- **Privacy policy:** marked DRAFT. Have it reviewed (TCPA / 10DLC texting rules matter here).

## How the forms work right now

Each form posts JSON with `fetch()` to `/api/driver`, `/api/carrier` or `/api/referral`.
If that endpoint doesn't exist yet (any static host), the visitor still gets a friendly thank-you plus
a note that the form isn't hooked up yet, and an **"Email my answers"** button that opens a pre-filled
email to hello@roadreadycrew.com, so no lead is lost. A hidden honeypot field (`company_website`) catches basic bots.

## Wiring the forms (pick one)

### Option A: Cloudflare Pages Functions + D1 (recommended, free tier)

The function is already written: `functions/api/[form].js`.

```bash
cd site
npx wrangler login                         # once (needs Node 22+)
npx wrangler d1 create roadreadycrew       # copy the database_id it prints
npx wrangler d1 execute roadreadycrew --remote --file=schema.sql
```

Then in the Cloudflare dashboard: **Workers & Pages → roadreadycrew → Settings → Bindings → Add → D1 database**,
variable name `DB`, database `roadreadycrew`. (Or add a `wrangler.toml` with a `[[d1_databases]]` binding.)
Optional: add an environment variable `NOTIFY_WEBHOOK` (Slack/Discord/Zapier URL) to get pinged on every new lead.

Read leads:

```bash
npx wrangler d1 execute roadreadycrew --remote --command "SELECT id, form, created_at, data FROM submissions ORDER BY id DESC LIMIT 20"
```

Until `DB` is bound, the function returns 503 and visitors see the email fallback.

### Option B: Formspree (no code, works on GitHub Pages too)

1. Create a free form at formspree.io for each form (driver, carrier, referral).
2. Change each `<form action="/api/...">` to your Formspree URL, e.g. `action="https://formspree.io/f/abcdwxyz"`.
3. `main.js` already sends JSON with `Accept: application/json`, which Formspree accepts. Done.

Whatever you use, **keep the consent records** (timestamp, IP, the exact consent wording). The D1 function does this automatically.

## Deploy

### Cloudflare Pages (planned)

```bash
cd site
npx wrangler pages project create roadreadycrew --production-branch main   # first time only
npx wrangler pages deploy . --project-name roadreadycrew
```

Run it from inside `site/` so the `functions/` folder gets picked up. You get `https://roadreadycrew.pages.dev`.
Later: **Custom domains → add roadreadycrew.com** once bought.
Or connect the GitHub repo in the dashboard (framework preset: None, build command: empty, output directory: `/`).

### GitHub Pages (free preview)

Push this folder as the repo root, then **Settings → Pages → Deploy from a branch → `main` / root**.
Every link is relative, so it works under `https://<user>.github.io/roadreadycrew/`.
Forms on GitHub Pages always use the email fallback (or Formspree, option B). The `functions/` folder is ignored there.

### Local preview

```bash
cd site && python3 -m http.server 8787   # then open http://localhost:8787
```

## Notes

- No SSN, date of birth or license number is collected anywhere, on purpose. Carriers collect those on their own DOT application.
- Motion (hero fade/slide, slow zoom, highway stripe) is turned off for visitors with "reduce motion" enabled.
- Screenshots of the draft are in `screens/`.
