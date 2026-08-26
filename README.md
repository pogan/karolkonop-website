# karol.konop.pl

The source for [karol.konop.pl](https://karol.konop.pl/) — Karol Konop's personal business site. It's a single-page site that pitches his services as a creative/artistic manager for musicians and bands (strategy, brand, EPKs, band websites, ongoing advisory), built and run as a small production web app: Express backend, a hand-rolled front end, its own SMTP-relayed contact form, and a documented nginx/PM2 deployment.

It's a small project, but it's a complete one end to end — front end, backend, build pipeline, security hardening and deployment config all live in this one repo, which is what makes it a reasonable sample of how the author approaches a project: plan the whole path from code to production, not just the part that's fun.

## What the site is

One HTML page (`public/index.html`), sectioned with anchor navigation: home, what I do, who I work with, how I can help, service packages with pricing, about, FAQ, contact form, and an embedded booking calendar for free consultations. The footer carries a newsletter signup (Bandsintown) and social links. Structured data (`schema.org` `Person`, `ProfessionalService`, `FAQPage`, `WebSite`) is embedded as JSON-LD for SEO and rich results — including a service catalog with real pricing, which is not something you see boilerplate about.

Copy and content are in Polish, the author's and the site's primary audience's language.

## Tech stack

- **Backend:** Node.js + [Express 5](https://expressjs.com/). `karolkonop-website-express-app.js` serves `public/` statically and exposes one endpoint, `POST /send-email`, which relays the contact form via [Nodemailer](https://nodemailer.com/) over SMTP.
- **Security middleware:** [Helmet](https://helmetjs.github.io/) with an explicit, allowlisted CSP (only Google Fonts and the embedded Google Calendar/Bandsintown iframes are permitted — no wildcard `unsafe-inline`), plus [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) (5 requests/hour/IP on the contact endpoint) and a honeypot field against bots.
- **Front end:** No framework. `public/js/app.js` is ~80 lines of hand-written vanilla JS that replaces `bootstrap.bundle.min.js` (dropped to avoid shipping 80 KB of render-blocking JS, plus Popper, for a page with no dropdowns) — it only toggles the navbar and submits the contact form via `fetch`.
- **Styling:** SCSS (`scss/main.scss`) compiled with [Dart Sass](https://sass-lang.com/). Bootstrap 5 is imported piecemeal — only the specific modules the page actually uses (grid, forms, buttons, nav/navbar, cards, utilities) — rather than the whole framework, to keep the compiled CSS lean. A small custom design system sits on top: three color tokens, two typefaces (Sofia Sans Condensed for display type, Spline Sans Mono for body copy), no rounded corners, no shadows.
- **Image pipeline:** `scripts/optimize-images.js` (using [sharp](https://sharp.pixelplumbing.com/)) re-encodes source photography in `assets/` into WebP, generates the Open Graph card, and derives the full favicon/icon set from a single SVG — run on demand via `npm run build:img`, not on every deploy.
- **Base:** originally bootstrapped from [HTML5 Boilerplate](https://html5boilerplate.com/) (see `LICENSE.txt`); most of that scaffolding has since been replaced, but the license is kept as attribution.

## Notable technical/architecture decisions

- **`public/` is the only thing ever served, and that's deliberate, not incidental.** An earlier version of the app used `express.static(__dirname)`, which published the entire project directory — including a config file sitting next to `index.html` that held live SMTP credentials, reachable at a public URL. The fix wasn't a patch; it was restructuring the repo so secrets and server source can never be inside the served directory, by construction. That history is documented in `CLAUDE.md` as a rule the codebase actively guards against.
- **Build artifacts are committed on purpose.** `public/css/main.css` and the generated images are checked into git, so a deploy is `git pull` with no build step and no `sharp`/`sass` needed on the production server — a deliberate trade-off (repo size vs. deploy simplicity and a smaller server dependency footprint) rather than an oversight.
- **The reverse proxy and app have a clear division of responsibility.** TLS termination, HSTS, gzip and static-asset cache headers live in nginx (`nginx.conf.example`); the app explicitly disables Helmet's HSTS and does not add compression middleware, to avoid the two layers fighting each other or double-compressing already-compressed WebP/JPEG assets.
- **The rate limiter is correctness-sensitive to the process model.** `ecosystem.config.js` pins PM2 to a single fork-mode instance — the contact-form rate limiter keeps its counters in memory, so running multiple workers would silently multiply the effective limit. That constraint, and why it exists, is documented directly in the PM2 config rather than left to be rediscovered.
- **Accessibility/UX details that are easy to skip on a small site:** a skip-to-content link, `aria-live` status updates on the contact form, honeypot bot protection that returns a fake success (so bots don't learn to route around it), and an LCP image explicitly preloaded with `fetchpriority="high"` since it's a CSS background-image the browser would otherwise discover late.

## Project layout

```
karolkonop-website-express-app.js   Express server + contact form endpoint
public/                             Web root — the only directory served over HTTP
  index.html                        The site (single page, anchor-linked sections)
  css/main.css, img/, favicon*      Generated — do not hand-edit, see below
  js/app.js                         Hand-written front-end behaviour
scss/main.scss                      Stylesheet source (compiles to public/css/main.css)
assets/                             Source photography — not served; re-encoded by build:img
scripts/optimize-images.js          Image build pipeline (sharp)
ecosystem.config.js                 PM2 process config for production
nginx.conf.example                  Reference reverse-proxy config (TLS, gzip, caching)
.env.example                        Template for the required environment variables
CLAUDE.md                           Working notes / conventions for AI-assisted changes
```

`public/css/main.css` and everything generated into `public/img/` (plus the favicon/icon set and `meta.jpg`) are build output — edit `scss/main.scss` or the source files in `assets/` and rebuild; hand-editing the generated files gets silently overwritten by the next build.

## Running it locally

```bash
npm install

cp .env.example .env        # then fill in SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_TO
                             # quote any value containing '#' — Node's --env-file
                             # parser treats an unquoted '#' as a comment

npm run build                # build:css (Sass, compressed) + build:img (sharp)
npm start                    # node --env-file=.env, listens on :3003
```

Other scripts:

```bash
npm run watch:css   # Sass, expanded output, recompiles on change — for development
npm run build:css   # scss/main.scss -> public/css/main.css (minified, no source map)
npm run build:img   # assets/ -> public/img/*.webp, meta.jpg, favicon/icon set
```

There is no test suite — this is a small, largely static marketing site, and the one piece of server logic (the contact form) is short and manually verified. `npm start` fails fast with a clear error if any required environment variable is missing, which is the main correctness check that matters at this scale.

## Deployment

Production runs behind nginx (TLS termination, HSTS, gzip, static-asset caching — see `nginx.conf.example`) in front of a single Node process managed by PM2 (`ecosystem.config.js`). Because build output is committed, a deploy is:

```bash
git pull
pm2 restart karolkonop-website --update-env
```

No build step, no extra dependencies, on the server itself.

## License

`LICENSE.txt` is the MIT license inherited from the HTML5 Boilerplate template this project started from. Site copy, photography and brand assets are not covered by it.
