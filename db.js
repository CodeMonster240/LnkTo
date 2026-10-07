// ---------------------------------------------------------------------------
// db.js — equivalent of `url/models.py` + `app.py`'s `db = SQLAlchemy(app)`.
//
// We use `better-sqlite3` because it's synchronous, has zero external
// setup, and gives us a single-file SQLite DB the same way the Python
// version did. Synchronous calls are fine here because the DB is local
// and the operations are O(1) for our scale.
//
// Schema (idempotent CREATE IF NOT EXISTS, safe to run on every boot):
//   urls(id, old, new, hits, created)
//   hits(id, url_id FK ON DELETE CASCADE, ts, referrer, user_agent, device)
//
// The `hits` table is new — the Python port only stored a counter. We
// keep a row per redirect so the analytics page can show time series,
// referrers, devices, and a recent-activity feed.
// ---------------------------------------------------------------------------
'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { SQLITE_PATH } = require('./config');

function resolveSqlitePath(url) {
  if (!url) return SQLITE_PATH;
  if (url.startsWith('sqlite:///')) return url.slice('sqlite:///'.length);
  if (url === ':memory:') return ':memory:';
  return url;
}

const dbFile = resolveSqlitePath(
  process.env.LNKTO_DATABASE_URL
    ? process.env.LNKTO_DATABASE_URL
    : `sqlite:///${SQLITE_PATH}`
);

try {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
} catch (_e) { /* in-memory DB has no parent */ }

const db = new Database(dbFile === ':memory:' ? ':memory:' : dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS urls (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    old     TEXT    NOT NULL,
    new     TEXT    NOT NULL UNIQUE,
    hits    INTEGER NOT NULL DEFAULT 0,
    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_urls_new ON urls(new);

  CREATE TABLE IF NOT EXISTS hits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id     INTEGER NOT NULL,
    ts         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    referrer   TEXT,
    user_agent TEXT,
    device     TEXT,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
  );
    CREATE INDEX IF NOT EXISTS idx_hits_url_ts ON hits(url_id, ts DESC);

  CREATE TABLE IF NOT EXISTS url_settings (
    url_id              INTEGER PRIMARY KEY,
    show_redirect_page  INTEGER NOT NULL DEFAULT 0,
    redirect_duration   INTEGER NOT NULL DEFAULT 3,
    show_thumbnail      INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
  );
`);

const Url = {
  findByCode(code) {
    return db.prepare('SELECT * FROM urls WHERE new = ?').get(code) || null;
  },

  create({ old, new: code, settings: settingsOpts = {} }) {
    const info = db
      .prepare('INSERT INTO urls (old, new) VALUES (?, ?)')
      .run(old, code);
    const urlId = info.lastInsertRowid;

    // Persist link-level settings (redirect page, thumbnail, etc.).
    const s = {
      showRedirectPage: settingsOpts.showRedirectPage || false,
      redirectDuration: settingsOpts.redirectDuration || 3,
      showThumbnail: settingsOpts.showThumbnail || false,
    };
    db.prepare(
      `INSERT INTO url_settings (url_id, show_redirect_page, redirect_duration, show_thumbnail)
       VALUES (?, ?, ?, ?)`
    ).run(
      urlId,
      s.showRedirectPage ? 1 : 0,
      s.redirectDuration,
      s.showThumbnail ? 1 : 0
    );

    return Url.findById(urlId);
  },

  findById(id) {
    return db.prepare('SELECT * FROM urls WHERE id = ?').get(id) || null;
  },

  // --- Settings (per-link) ---------------------------------------------------

  findWithSettings(code) {
    const url = Url.findByCode(code);
    if (!url) return null;
    const settings = db
      .prepare(
        `SELECT url_id,
                show_redirect_page AS showRedirectPage,
                redirect_duration AS redirectDuration,
                show_thumbnail AS showThumbnail
         FROM url_settings WHERE url_id = ?`
      )
      .get(url.id);
    if (settings) {
      url.showRedirectPage = !!settings.showRedirectPage;
      url.redirectDuration = settings.redirectDuration || 3;
      url.showThumbnail = !!settings.showThumbnail;
    } else {
      url.showRedirectPage = false;
      url.redirectDuration = 3;
      url.showThumbnail = false;
    }
    return url;
  },

  settings(code) {
    const url = Url.findByCode(code);
    if (!url) return null;
    const row = db
      .prepare(
        `SELECT url_id,
                show_redirect_page AS showRedirectPage,
                redirect_duration AS redirectDuration,
                show_thumbnail AS showThumbnail
         FROM url_settings WHERE url_id = ?`
      )
      .get(url.id) || {
        urlId: url.id,
        showRedirectPage: 0,
        redirectDuration: 3,
        showThumbnail: 0,
      };
    return {
      urlId: row.url_id,
      showRedirectPage: !!row.showRedirectPage,
      redirectDuration: row.redirectDuration || 3,
      showThumbnail: !!row.showThumbnail,
    };
  },

  updateSettings(code, { showRedirectPage, redirectDuration, showThumbnail }) {
    const url = Url.findByCode(code);
    if (!url) return null;
    db.prepare(
      `INSERT INTO url_settings (url_id, show_redirect_page, redirect_duration, show_thumbnail)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(url_id) DO UPDATE SET
         show_redirect_page = excluded.show_redirect_page,
         redirect_duration  = excluded.redirect_duration,
         show_thumbnail     = excluded.show_thumbnail`
    ).run(
      url.id,
      showRedirectPage ? 1 : 0,
      redirectDuration || 3,
      showThumbnail ? 1 : 0
    );
    return { ...url, showRedirectPage, redirectDuration: redirectDuration || 3, showThumbnail };
  },

  deleteByCode(code) {
    const info = db.prepare('DELETE FROM urls WHERE new = ?').run(code);
    return info.changes > 0;
  },

  recordHit(code, { referrer, userAgent, device }) {
    const row = Url.findByCode(code);
    if (!row) return null;
    const tx = db.transaction(() => {
      db.prepare(
        'INSERT INTO hits (url_id, referrer, user_agent, device) VALUES (?, ?, ?, ?)'
      ).run(row.id, referrer || null, userAgent || null, device || null);
      db.prepare('UPDATE urls SET hits = hits + 1 WHERE id = ?').run(row.id);
    });
    tx();
    return Url.findByCode(code);
  },

  analytics(code) {
    const url = Url.findByCode(code);
    if (!url) return null;

    const daily = db
      .prepare(
        `SELECT date(ts) AS day, COUNT(*) AS c
         FROM hits
         WHERE url_id = ? AND ts >= datetime('now', '-14 days')
         GROUP BY day
         ORDER BY day ASC`
      )
      .all(url.id);

    const dailyMap = Object.fromEntries(daily.map((r) => [r.day, r.c]));
    const series = [];
    const now = new Date();
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const day = d.toISOString().slice(0, 10);
      series.push({ day, count: dailyMap[day] || 0 });
    }

    const referrers = db
      .prepare(
        `SELECT COALESCE(NULLIF(referrer, ''), 'Direct / none') AS host,
                COUNT(*) AS c
         FROM hits
         WHERE url_id = ?
         GROUP BY host
         ORDER BY c DESC
         LIMIT 8`
      )
      .all(url.id);

    const devices = db
      .prepare(
        `SELECT COALESCE(NULLIF(device, ''), 'Unknown') AS device,
                COUNT(*) AS c
         FROM hits
         WHERE url_id = ?
         GROUP BY device
         ORDER BY c DESC`
      )
      .all(url.id);

    const recent = db
      .prepare(
        `SELECT ts, referrer, user_agent, device
         FROM hits
         WHERE url_id = ?
         ORDER BY id DESC
         LIMIT 50`
      )
      .all(url.id);

    const peak = series.reduce((m, d) => Math.max(m, d.count), 0);
    const last7 = series.slice(-7).reduce((s, d) => s + d.count, 0);
    const prev7 = series.slice(0, 7).reduce((s, d) => s + d.count, 0);
    const trend =
      prev7 === 0 ? null : Math.round(((last7 - prev7) / prev7) * 100);

    return {
      url,
      series,
      peak,
      last7,
      prev7,
      trend,
      referrers,
      devices,
      recent,
    };
  },

  paginate({ page = 1, perPage = 10, q = '', sort = 'recent' } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (safePage - 1) * perPage;

    const orderBy =
      {
        recent: 'id DESC',
        oldest: 'id ASC',
        hits_desc: 'hits DESC, id DESC',
        hits_asc: 'hits ASC, id DESC',
        code_asc: 'new ASC',
        code_desc: 'new DESC',
      }[sort] || 'id DESC';

    const where = q ? 'WHERE new LIKE ? OR old LIKE ?' : '';
    const like = `%${q}%`;
    const countParams = q ? [like, like] : [];
    const params = q ? [like, like, perPage, offset] : [perPage, offset];

    const total = db
      .prepare(`SELECT COUNT(*) AS c FROM urls ${where}`)
      .get(...countParams).c;

    const items = db
      .prepare(
        `SELECT * FROM urls ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
      )
      .all(...params);

    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return {
      items,
      page: safePage,
      perPage,
      total,
      totalPages,
      has_prev: safePage > 1,
      has_next: safePage < totalPages,
      prev_num: Math.max(1, safePage - 1),
      next_num: Math.min(totalPages, safePage + 1),
      q,
      sort,
    };
  },
};

module.exports = { db, Url, DB_FILE: dbFile };
