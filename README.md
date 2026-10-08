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
- Link management and analytics are private to the browser that created each
  link, using a cryptographically random persistent cookie.
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
4. Create a Turso database and database token:

   ```bash
   turso db create lnkto
   turso db show lnkto
   turso db tokens create lnkto
   ```

   Copy the `libsql://...` URL from `turso db show` and the token printed by
   `turso db tokens create`. Add them as `TURSO_DATABASE_URL`,
   `TURSO_AUTH_TOKEN`, and `SECRET_KEY` environment variables in Vercel.
   Do not include quotes or surrounding whitespace in either Turso value.
   Ensure the variables are enabled for the deployment's environment
   (usually **Production**), then redeploy. `TURSO_DATABASE_URL` switches the
   app to the persistent Turso database.

The `vercel.json` file sends every request to the Express function. Vercel
functions do not support the long-running WebSocket server, so live updates
are disabled there while normal pages and redirects continue to work.

Do not use the local SQLite fallback for production on Vercel. Serverless
instances have separate ephemeral files, so a link created by one instance can
return a 404 when its redirect request reaches another instance. Turso
provides the persistent SQLite-compatible store required for production.

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
| `TURSO_DATABASE_URL`  | (unset) | Persistent Turso/libSQL URL used on Vercel. |
| `TURSO_AUTH_TOKEN`    | (unset) | Authentication token for `TURSO_DATABASE_URL`. |
| `HOST` / `PORT`       | `0.0.0.0` / `5001`     | Server bind address / port.                   |

> We deliberately do **not** read `DATABASE_URL`. Use
> `LNKTO_DATABASE_URL` instead so the database driver is unambiguous.

If the app reports Turso HTTP 401, the database URL is reachable but the
token was rejected. Generate a fresh token for the exact database named in
`TURSO_DATABASE_URL`, replace the Vercel `TURSO_AUTH_TOKEN` value in the
correct environment, and create a new deployment. Never commit the token or
put it in `.env.example`.

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
- **Ownership** — the app sets an HttpOnly `lnkto_session` cookie for each
  browser. A SHA-256 hash of that token is stored with each link, so the raw
  token is never stored in the database or exposed in URLs. The cookie lasts
  ten years and is independent of the browser cache, though clearing site
  cookies or using a different browser creates a new identity.
