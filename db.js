'use strict';

const { createClient } = require('@libsql/client');
const { SQLITE_PATH, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = require('./config');

const remote = Boolean(TURSO_DATABASE_URL);
if (remote && !TURSO_AUTH_TOKEN) {
  throw new Error(
    'TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is configured. ' +
    'Create a database token and add it to the same Vercel environment.'
  );
}
const dbFile = remote ? TURSO_DATABASE_URL : SQLITE_PATH;
const client = createClient({
  url: remote ? TURSO_DATABASE_URL : `file:${SQLITE_PATH}`,
  authToken: remote ? TURSO_AUTH_TOKEN : undefined,
});

const schema = [
  `CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    old TEXT NOT NULL,
    new TEXT NOT NULL UNIQUE,
    owner_token_hash TEXT,
    hits INTEGER NOT NULL DEFAULT 0,
    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS idx_urls_new ON urls(new)',
  `CREATE TABLE IF NOT EXISTS hits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id INTEGER NOT NULL,
    ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    referrer TEXT,
    user_agent TEXT,
    device TEXT,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_hits_url_ts ON hits(url_id, ts DESC)',
  `CREATE TABLE IF NOT EXISTS url_settings (
    url_id INTEGER PRIMARY KEY,
    show_redirect_page INTEGER NOT NULL DEFAULT 0,
    redirect_duration INTEGER NOT NULL DEFAULT 3,
    show_thumbnail INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_urls_owner ON urls(owner_token_hash)',
];

const ready = client.batch(schema.map((sql) => ({ sql })), 'write').catch((err) => {
  if (err && err.cause && err.cause.status === 401) {
    throw new Error(
      'Turso rejected TURSO_AUTH_TOKEN (HTTP 401). Generate a new token for ' +
      'this database, update the Vercel environment variable, and redeploy.',
      { cause: err }
    );
  }
  throw err;
});

async function query(sql, args = []) {
  await ready;
  const result = await client.execute({ sql, args });
  return result.rows;
}

async function execute(sql, args = []) {
  await ready;
  return client.execute({ sql, args });
}

const Url = {
  async findByCode(code) {
    return (await query('SELECT * FROM urls WHERE new = ?', [code]))[0] || null;
  },

  async create({ old, new: code, ownerTokenHash, settings: options = {} }) {
    const result = await execute(
      'INSERT INTO urls (old, new, owner_token_hash) VALUES (?, ?, ?)',
      [old, code, ownerTokenHash]
    );
    const id = Number(result.lastInsertRowid);
    await execute(
      `INSERT INTO url_settings
       (url_id, show_redirect_page, redirect_duration, show_thumbnail)
       VALUES (?, ?, ?, ?)`,
      [id, options.showRedirectPage ? 1 : 0, options.redirectDuration || 3, options.showThumbnail ? 1 : 0]
    );
    return (await query('SELECT * FROM urls WHERE id = ?', [id]))[0] || null;
  },

  async findWithSettings(code) {
    const url = await this.findByCode(code);
    if (!url) return null;
    const settings = (await query(
      `SELECT show_redirect_page AS showRedirectPage,
              redirect_duration AS redirectDuration,
              show_thumbnail AS showThumbnail
       FROM url_settings WHERE url_id = ?`,
      [url.id]
    ))[0];
    return {
      ...url,
      showRedirectPage: !!(settings && settings.showRedirectPage),
      redirectDuration: settings ? settings.redirectDuration || 3 : 3,
      showThumbnail: !!(settings && settings.showThumbnail),
    };
  },

  async settings(code, ownerTokenHash) {
    const url = (await query(
      'SELECT id FROM urls WHERE new = ? AND owner_token_hash = ?',
      [code, ownerTokenHash]
    ))[0];
    if (!url) return null;
    const row = (await query(
      `SELECT show_redirect_page AS showRedirectPage,
              redirect_duration AS redirectDuration,
              show_thumbnail AS showThumbnail
       FROM url_settings WHERE url_id = ?`,
      [url.id]
    ))[0] || {};
    return {
      urlId: url.id,
      showRedirectPage: !!row.showRedirectPage,
      redirectDuration: row.redirectDuration || 3,
      showThumbnail: !!row.showThumbnail,
    };
  },

  async updateSettings(code, settings, ownerTokenHash) {
    const url = (await query(
      'SELECT * FROM urls WHERE new = ? AND owner_token_hash = ?',
      [code, ownerTokenHash]
    ))[0];
    if (!url) return null;
    await execute(
      `INSERT INTO url_settings
       (url_id, show_redirect_page, redirect_duration, show_thumbnail)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(url_id) DO UPDATE SET
         show_redirect_page = excluded.show_redirect_page,
         redirect_duration = excluded.redirect_duration,
         show_thumbnail = excluded.show_thumbnail`,
      [url.id, settings.showRedirectPage ? 1 : 0, settings.redirectDuration || 3, settings.showThumbnail ? 1 : 0]
    );
    return { ...url, ...settings, redirectDuration: settings.redirectDuration || 3 };
  },

  async deleteByCode(code, ownerTokenHash) {
    const result = await execute(
      'DELETE FROM urls WHERE new = ? AND owner_token_hash = ?',
      [code, ownerTokenHash]
    );
    return Number(result.rowsAffected) > 0;
  },

  async recordHit(code, { referrer, userAgent, device }) {
    const row = await this.findByCode(code);
    if (!row) return null;
    await client.batch([
      { sql: 'INSERT INTO hits (url_id, referrer, user_agent, device) VALUES (?, ?, ?, ?)', args: [row.id, referrer || null, userAgent || null, device || null] },
      { sql: 'UPDATE urls SET hits = hits + 1 WHERE id = ?', args: [row.id] },
    ], 'write');
    return this.findByCode(code);
  },

  async analytics(code, ownerTokenHash) {
    const url = (await query(
      'SELECT * FROM urls WHERE new = ? AND owner_token_hash = ?',
      [code, ownerTokenHash]
    ))[0];
    if (!url) return null;
    const daily = await query(
      `SELECT date(ts) AS day, COUNT(*) AS c FROM hits
       WHERE url_id = ? AND ts >= datetime('now', '-14 days')
       GROUP BY day ORDER BY day ASC`,
      [url.id]
    );
    const series = [];
    const dailyMap = Object.fromEntries(daily.map((row) => [row.day, Number(row.c)]));
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i);
      const day = date.toISOString().slice(0, 10);
      series.push({ day, count: dailyMap[day] || 0 });
    }
    const [referrers, devices, recent] = await Promise.all([
      query(`SELECT COALESCE(NULLIF(referrer, ''), 'Direct / none') AS host,
                    COUNT(*) AS c FROM hits WHERE url_id = ?
              GROUP BY host ORDER BY c DESC LIMIT 8`, [url.id]),
      query(`SELECT COALESCE(NULLIF(device, ''), 'Unknown') AS device,
                    COUNT(*) AS c FROM hits WHERE url_id = ?
              GROUP BY device ORDER BY c DESC`, [url.id]),
      query(`SELECT ts, referrer, user_agent, device FROM hits
              WHERE url_id = ? ORDER BY id DESC LIMIT 50`, [url.id]),
    ]);
    const peak = series.reduce((max, day) => Math.max(max, day.count), 0);
    const last7 = series.slice(-7).reduce((sum, day) => sum + day.count, 0);
    const prev7 = series.slice(0, 7).reduce((sum, day) => sum + day.count, 0);
    return {
      url, series, peak, last7, prev7,
      trend: prev7 === 0 ? null : Math.round(((last7 - prev7) / prev7) * 100),
      referrers, devices, recent,
    };
  },

  async paginate({ page = 1, perPage = 10, q = '', sort = 'recent', ownerTokenHash } = {}) {
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (currentPage - 1) * perPage;
    const orderBy = {
      recent: 'id DESC', oldest: 'id ASC', hits_desc: 'hits DESC, id DESC',
      hits_asc: 'hits ASC, id DESC', code_asc: 'new ASC', code_desc: 'new DESC',
    }[sort] || 'id DESC';
    const where = q ? 'owner_token_hash = ? AND (new LIKE ? OR old LIKE ?)' : 'owner_token_hash = ?';
    const args = q ? [ownerTokenHash, `%${q}%`, `%${q}%`] : [ownerTokenHash];
    const [countRows, items] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM urls WHERE ${where}`, args),
      query(`SELECT * FROM urls WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...args, perPage, offset]),
    ]);
    const total = Number(countRows[0].c);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return {
      items, page: currentPage, perPage, total, totalPages,
      has_prev: currentPage > 1, has_next: currentPage < totalPages,
      prev_num: Math.max(1, currentPage - 1), next_num: Math.min(totalPages, currentPage + 1),
      q, sort,
    };
  },
};

const db = {
  async close() {
    await ready;
    client.close();
  },
  async count() {
    return Number((await query('SELECT COUNT(*) AS c FROM urls'))[0].c);
  },
};

module.exports = { db, Url, DB_FILE: dbFile, remote };
