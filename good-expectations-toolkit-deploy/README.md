# Good Expectations Toolkit — website

A static, no-build marketing site for **Good Expectations Toolkit** (an AI
prompt/template/workflow library), ready to deploy on **Cloudflare Pages**.

## What's in here

```
.
├── index.html            Homepage
├── about.html            About page
├── services.html         "What's Inside" (product/categories + pricing)
├── contact.html          Contact page (form + FAQ)
├── 404.html              Not-found page
├── css/styles.css        All styles (design tokens at the top)
├── js/main.js            Nav toggle, scroll reveal, form handling
├── images/               Logo, favicons, OG image (SVG sources + PNG/ICO exports)
├── functions/api/contact.js   Cloudflare Pages Function — handles the contact form
├── _headers              Security + cache headers (Cloudflare Pages)
├── _redirects            Convenience URL redirects (Cloudflare Pages)
├── robots.txt / sitemap.xml   SEO
├── site.webmanifest      PWA/mobile metadata
├── wrangler.toml         Cloudflare config
└── package.json          npm scripts for local dev/deploy
```

No build step, no framework, no bundler — every HTML file links directly
to `css/styles.css` and `js/main.js`. Edit and refresh.

## Editing the content

- **Business details to update before going live:** email address
  (`hello@goodexpectationstoolkit.com` — appears in every page footer, the
  contact page, and `functions/api/contact.js`'s fallback error message),
  the domain (`https://goodexpectationstoolkit.com` — appears in canonical
  URLs, Open Graph tags, `sitemap.xml` and `robots.txt`), and the price on
  `services.html` (`$49` — also mirrored in the `Product` JSON-LD block).
- **Copy** for all four pages is real, ready-to-publish draft copy based on
  the product description provided, not lorem ipsum — but review it as a
  first draft, especially testimonials on the homepage (currently
  illustrative placeholders) and the founder/team paragraph on `about.html`.
- **Design tokens** (colors, type, spacing scale) live at the top of
  `css/styles.css` under `:root`. Change a color there and it updates
  everywhere.

## Wiring up the contact form

The form on `contact.html` posts JSON to `/api/contact`, handled by
`functions/api/contact.js`. As shipped, it validates input and (if no email
provider is configured) simply logs the submission and returns success —
so the form works end-to-end immediately, but nobody receives an email yet.

To actually receive submissions by email:

1. Sign up at [resend.com](https://resend.com) (or swap the fetch call in
   `functions/api/contact.js` for any other provider/API).
2. Verify a sending domain there and get an API key.
3. In the Cloudflare Pages dashboard, go to your project → **Settings →
   Environment variables** and add:
   - `RESEND_API_KEY` — your Resend API key
   - `CONTACT_TO_EMAIL` — the inbox that should receive submissions
   - `CONTACT_FROM_EMAIL` — a verified sender address on your domain
4. Redeploy. No code changes needed.

Alternatively, replace the Resend call with a write to Cloudflare KV/D1, or
a webhook to Slack/Zapier/etc. — the front end only cares that `/api/contact`
returns a JSON response with a 2xx status on success.

## Deploying to Cloudflare Pages

### Option A — Git integration (recommended)

1. Push this folder to a GitHub/GitLab repository.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages →
   Connect to Git**, and select the repository.
3. Build settings:
   - **Build command:** (leave empty — there is no build step)
   - **Build output directory:** `/`
4. Add the environment variables from the section above under **Settings →
   Environment variables** (for both Production and Preview, if you want
   the form to work on preview deploys too).
5. Deploy. Cloudflare will redeploy automatically on every push.

### Option B — Direct upload with Wrangler CLI

```bash
npm install          # installs wrangler locally
npm run dev          # preview locally at http://localhost:8788
npm run deploy        # deploy directly to Cloudflare Pages
```

The first `deploy` will prompt you to log in to Cloudflare and create the
Pages project (`good-expectations-toolkit`, matching `wrangler.toml`).

### Custom domain

Once deployed, add your domain under the Pages project's **Custom domains**
tab, then update the URLs in `robots.txt`, `sitemap.xml`, and the
`canonical`/`og:url` tags in each HTML `<head>` if the domain differs from
`goodexpectationstoolkit.com`.

## Accessibility & performance notes

- Motion respects `prefers-reduced-motion` throughout (hero card animation
  and scroll reveals both degrade to a static, fully visible state).
- All interactive controls are keyboard-reachable with visible focus
  states; the mobile nav toggle and FAQ accordion use native semantics
  (`<button aria-expanded>`, `<details>/<summary>`).
- Fonts are loaded from Google Fonts with `preconnect` hints; swap for
  self-hosted `.woff2` files under `css/` if you'd rather not depend on an
  external font host.
- Images are all inline SVG/lightweight PNG — no large hero photography to
  optimize.
