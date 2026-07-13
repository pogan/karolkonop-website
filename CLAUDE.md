# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The personal/business site at karol.konop.pl — a single Polish-language landing page served by a minimal Express app that also relays the contact form over SMTP. No framework, no client-side router, no test suite.

## Commands

```bash
npm install
npm run build:css    # scss/main.scss -> public/css/main.css (minified)
npm run watch:css    # same, expanded + watching, for development
npm run build:img    # assets/ -> public/img/*.webp, meta.jpg, favicon + icon set
npm run build        # build:css && build:img
npm start            # node --env-file=.env, listens on :3003
```

There are no tests. `npm start` fails fast if `.env` is missing or incomplete.

## Layout: public/ is the web root

`public/` is the **only** directory served over HTTP. Everything else — server source, `.env`, `package.json`, `scss/`, `assets/`, `node_modules/` — sits outside it and is unreachable by construction.

This matters: the server previously did `express.static(__dirname)`, which published the whole project directory, and `config.js` (SMTP credentials, gitignored but sitting next to `index.html`) was downloadable at `https://karol.konop.pl/config.js`. **Never mount a static root above `public/`, and never put a secret inside it.**

- `public/` — `index.html`, `404.html`, `css/` (generated), `js/app.js`, `img/` (generated), icons, `robots.txt`, `sitemap.xml`, `site.webmanifest`
- `assets/` — original photography and `meta.png`. Sources only; `npm run build:img` re-encodes them into `public/`. Not served.
- `scss/main.scss` — the only stylesheet source.
- `scripts/optimize-images.js` — the image pipeline.

## Generated files — do not hand-edit

`public/css/main.css` and everything in `public/img/`, plus `public/meta.jpg`, `favicon.ico` and the PNG icon set, are build artifacts. Edit `scss/main.scss` or the files in `assets/` and run `npm run build` — editing the compiled output directly will be silently overwritten by the next build.

They are **committed** (not gitignored) on purpose, so deploying is a plain `git pull` with no build step and no `sharp` on the server. The consequence: after changing SCSS or a photo, rebuild and commit the output, or the deployed site won't reflect your change.

## Configuration

All secrets come from the environment; there is no config file. `npm start` loads `.env` via Node's `--env-file`. Required: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO` (see `.env.example`). `.env` is gitignored.

**Quote any value containing `#`.** Node's `--env-file` parser treats an unquoted `#` as the start of a comment and silently truncates the value there. A password like `X!WG564xpv#Vav?` arrives as `X!WG564xpv`, and SMTP fails with `535 Authentication failed` even though the password is correct. If auth fails, check the parsed length before suspecting the credential.

## Server

`karolkonop-website-express-app.js`:

- serves `public/` statically, with a catch-all that returns `public/404.html`
- `POST /send-email` — validates the payload, checks a honeypot field, rate-limits to 5/hour per IP, then relays via nodemailer

Hardening that is easy to break without noticing:

- **`app.set('trust proxy', 1)`** is required because nginx sits in front. Remove it and `express-rate-limit` sees the proxy's IP for every visitor and throttles the whole world as one client.
- The **honeypot** is the `website` field in the contact form (hidden by `.hp-field` in SCSS). If it arrives non-empty the server returns 200 and silently drops the message — never signal rejection to a bot. Keep the field in the markup.
- **helmet's CSP** allowlists exactly the third parties in use: Google Fonts (`style-src`/`font-src`), Google Calendar and Bandsintown (`frame-src`). `script-src` is `'self'`, so **no inline `<script>`** — client JS belongs in `public/js/app.js`. (The JSON-LD block is `application/ld+json`, not executable, so it's fine.)
- HSTS is deliberately off in helmet; nginx owns it. See `nginx.conf.example`, which also owns gzip and cache headers — don't add a `compression` middleware.

## Front-end

`public/js/app.js` is hand-written and replaces `bootstrap.bundle.min.js` (80 KB, render-blocking, and bundling Popper for dropdowns the page doesn't have). It does two things: toggle the navbar collapse, and submit the contact form. If you add a Bootstrap component that needs JS, you must reintroduce Bootstrap's JS or write the behaviour yourself.

`scss/main.scss` imports Bootstrap **piecemeal** — only reboot, type, images, containers, grid, forms, buttons, transitions, nav, navbar, card, helpers and the utilities API. Adding markup that uses an unimported component (modal, dropdown, accordion, toast…) will silently render unstyled; add the `@import` for it.

### Design system

Three tokens at the top of `scss/main.scss` drive everything: `$ink` (near-black), `$paper` (off-white), `$accent` (peach `#ffdcbb`). `$primary` is bound to `$ink`, so **`.btn-primary` is the single call-to-action style** — don't reach for `btn-dark`/`btn-success` as the old markup did.

Type: Sofia Sans Condensed for headings and buttons, Spline Sans Mono for body. `display-*` classes are for **headings only** — the previous version used `.display-6` for entire paragraphs, which rendered body copy at headline size on phones. Body copy is plain `<p>`/`<li>` (16px, capped at 68ch); `.lead` is the one-sentence intro under a heading.

Other load-bearing rules: `.page` uses `width: 100%` (never `100vw` — it includes the scrollbar and causes horizontal overflow) and `scroll-margin-top: $navbar-height` so anchors clear the fixed navbar. `.hl` is the black highlight box. Photo sections go through the `photo-backdrop()` mixin, which lays a scrim under the image so white text meets contrast requirements.

Copy is Polish — keep user-facing strings, form messages and new content in Polish.
