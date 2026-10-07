# Node.js URL-Shortener

[Live Demo](https://glowsquid.com/url/) (on a not-so-short URL)

A Node.js / Express port of the original Flask URL shortener. Same
features, same SQLite database file format, same URL/code scheme — just
a different runtime.

## Features

- Shortens URLs to a default 3-character code (letters + digits).
- Checks if the shortened URL already exists and re-rolls the
  code-generator until it finds an available combination.
- All data is stored in a single **SQLite** file (`shortener.db`) — zero
  database setup.
- Case-sensitive. SQLite stores the values exactly as written.
- A Stats page lists all the shortened URLs, and shows how many times a
  target link has been redirected (paginated, 10 per page).
- A button automatically copies the shortened URL to clipboard.
- **No-CAPTCHA bot check** using a hidden honeypot field plus a
  time-based submit threshold — no third-party service, no JavaScript
  on the client, no API key.

![Screenshot](https://github.com/GlowSquid/Flask-URL-Shortener/blob/master/screenshot.gif)

## Requirements

- Node.js **>= 18** (tested on Node 24).

## Setup

```bash
npm install
npm start
```

That's it. The SQLite database file is created automatically in
`~/LnkTo_data/shortener.db` (if `HOME` is set) or in the project
directory otherwise. The first request creates the table on demand.

### One-liner

```bash
./start.sh
```

This is the Node.js equivalent of the Python `start.sh` — it installs
`node_modules` if missing and then runs `npm start`.

### Environment variables

All configuration is via env vars (or a `.env` file, see `.env.example`).
The behaviour mirrors the original Python `settings.py` 1:1.

| Variable              | Default                | Purpose                                       |
| --------------------- | ---------------------- | --------------------------------------------- |
| `SECRET_KEY`          | (dev fallback)         | Reserved — currently unused; kept for parity. |
| `DEBUG`               | `1`                    | `0` disables verbose logging.                 |
| `LNKTO_ENV`           | (unset)                | `production` disables the dev-only server name.|
| `LNKTO_DB_DIR`        | `~/LnkTo_data`         | Folder holding `shortener.db`.                |
| `LNKTO_DATABASE_URL`  | `sqlite:///$LNKTO_DB_DIR/shortener.db` | Full SQLite URL override.        |
| `HOST` / `PORT`       | `0.0.0.0` / `5001`     | Server bind address / port.                   |

> We deliberately do **not** read `DATABASE_URL` because some hosts
> (e.g. PythonAnywhere) auto-export it pointing at MySQL, which would
> break the app. Use `LNKTO_DATABASE_URL` instead.

## Project layout

```
.
├── app.js               # Express app factory (equivalent of app.py)
├── server.js            # entry point — `node server.js` (equivalent of run.py + main.py)
├── config.js            # env-var loader (equivalent of settings.py)
├── db.js                # better-sqlite3 wrapper + Url "model" (equivalent of url/models.py)
├── lib/
│   ├── code.js          # random short-code generator with collision check
│   ├── urlFor.js        # minimal url_for() helper used in EJS templates
│   └── validate.js      # URL field validation (port of url/forms.py)
├── routes/
│   ├── index.js         # GET/POST /   (honeypot + time-based bot check)
│   ├── stats.js         # GET /stats and /stats/:page
│   └── redirect.js      # GET /:code (302 redirect + hit counter)
├── views/               # EJS templates (Jinja2 → EJS, port of templates/)
│   ├── index.ejs
│   ├── success.ejs
│   ├── stats.ejs
│   ├── 404.ejs
│   └── partials/        # shared header/footer
├── public/              # static files (port of static/)
│   ├── css/style.css
│   ├── js/main.js
│   ├── js/clipboard.min.js
│   ├── chain.svg
│   └── favicon.ico
├── scripts/init-db.js   # equivalent of create_db.py — npm run init-db
├── package.json
├── start.sh             # one-shot local starter
└── .env.example
```

## Differences from the Python version

- **Spam protection** — the original used ALTCHA proof-of-work, which
  required a JavaScript widget, an extra HTTP round-trip, and ~2s of
  client-side solving. The Node port replaces it with a **hidden
  honeypot field + a 2-second time threshold**: zero JS on the client,
  zero third-party calls, and bots fail silently. See the comment
  block at the top of `routes/index.js`.
- **Templates** — Jinja2's `extends 'base.html'` doesn't translate
  cleanly to EJS. The Node port uses EJS `include` partials
  (`partials/_header.ejs` / `_footer.ejs`) instead.
- **`url_for()`** — Flask exposes `url_for` in every template context.
  We replicate that by adding a tiny `urlFor` helper in `lib/urlFor.js`
  and registering it on `res.locals` in `app.js`.
- **No WSGI** — production deployment on hosts that need a long-running
  process (Render, Fly, Railway, a VM, etc.) is just `node server.js`
  behind a reverse proxy, or `pm2 start server.js`. PythonAnywhere's
  WSGI model doesn't apply, so `wsgi.py` is dropped.
- **ORM** — SQLAlchemy → `better-sqlite3` with hand-written prepared
  statements. Schema and column types are byte-for-byte compatible.
