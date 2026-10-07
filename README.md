# Node.js URL-Shortener

[Live Demo](https://glowsquid.com/url/) (on a not-so-short URL)

A URL shortener built with Node.js, Express, EJS, and SQLite.

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

![Screenshot](./screenshot.gif)

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

It installs `node_modules` if missing and then runs `npm start`.

## Deploying to Vercel

1. Push this repository to GitHub and import it at
   [vercel.com/new](https://vercel.com/new).
2. Leave **Framework Preset** as **Other**. Vercel detects the Node.js
   function in `api/index.js`; do not select Flask or add a Python build
   command.
3. Set **Node.js Version** to 18 or newer in Project Settings.
4. Add `SECRET_KEY` as an environment variable, then deploy.

The `vercel.json` file sends every request to the Express function. Vercel
functions do not support the long-running WebSocket server, so live updates
are disabled there while normal pages and redirects continue to work.

SQLite files in Vercel functions are temporary and can be reset between
deployments or function instances. This setup is suitable for a demo or
single warm instance; use a persistent hosted database before relying on it
for production data.

### Environment variables

All configuration is via env vars (or a `.env` file, see `.env.example`).
The behavior is controlled by environment variables or a local `.env` file.

| Variable              | Default                | Purpose                                       |
| --------------------- | ---------------------- | --------------------------------------------- |
| `SECRET_KEY`          | (dev fallback)         | Reserved — currently unused; kept for parity. |
| `DEBUG`               | `1`                    | `0` disables verbose logging.                 |
| `LNKTO_ENV`           | (unset)                | `production` disables the dev-only server name.|
| `LNKTO_DB_DIR`        | `~/LnkTo_data`         | Folder holding `shortener.db`.                |
| `LNKTO_DATABASE_URL`  | `sqlite:///$LNKTO_DB_DIR/shortener.db` | Full SQLite URL override.        |
| `HOST` / `PORT`       | `0.0.0.0` / `5001`     | Server bind address / port.                   |

> We deliberately do **not** read `DATABASE_URL`. Use
> `LNKTO_DATABASE_URL` instead so the database driver is unambiguous.

## Project layout

```
.
├── app.js               # Express app factory
├── server.js            # long-running entry point — `node server.js`
├── api/index.js         # Vercel serverless function entry point
├── config.js            # env-var loader
├── db.js                # better-sqlite3 wrapper and URL data access
├── lib/
│   ├── code.js          # random short-code generator with collision check
│   ├── urlFor.js        # minimal url_for() helper used in EJS templates
│   └── validate.js      # URL field validation (port of url/forms.py)
├── routes/
│   ├── index.js         # GET/POST /   (honeypot + time-based bot check)
│   ├── stats.js         # GET /stats and /stats/:page
│   └── redirect.js      # GET /:code (302 redirect + hit counter)
├── views/               # EJS templates
│   ├── index.ejs
│   ├── success.ejs
│   ├── stats.ejs
│   ├── 404.ejs
│   └── partials/        # shared header/footer
├── public/              # browser assets served at /static
│   ├── css/style.css
│   ├── js/main.js
│   ├── js/clipboard.min.js
│   ├── chain.svg
│   └── favicon.ico
├── scripts/init-db.js   # database check — npm run init-db
├── package.json
├── start.sh             # one-shot local starter
└── .env.example
```

## Implementation notes

- **Spam protection** — the app uses a hidden honeypot field and a
  2-second time threshold: zero third-party calls and bots fail silently.
  See the comment block at the top of `routes/index.js`.
- **Templates** — EJS includes shared header and footer partials.
- **Named URLs** — `lib/urlFor.js` provides the small route helper used by
  the EJS templates.
- **Deployment** — production deployment on hosts that need a long-running
  process (Render, Fly, Railway, a VM, etc.) is `node server.js` behind a
  reverse proxy, or `pm2 start server.js`. Vercel uses `api/index.js`.
- **Database** — `better-sqlite3` uses hand-written prepared statements.
