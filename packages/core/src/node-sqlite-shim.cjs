'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

class NodeSqliteFallback {
  constructor(filenameGiven, options = {}) {
    let filename = filenameGiven;
    if (Buffer.isBuffer(filenameGiven)) {
      filename = ':memory:';
    }
    if (!filename || filename === '' || filename === ':memory:') {
      this.db = new DatabaseSync(':memory:');
    } else {
      const resolved = path.resolve(filename);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
      }
      this.db = new DatabaseSync(resolved);
    }
    try {
      this.db.exec('PRAGMA foreign_keys = ON;');
      this.db.exec('PRAGMA busy_timeout = 5000;');
    } catch {}
  }

  exec(sql) {
    return this.db.exec(sql);
  }

  pragma(sql) {
    try {
      return this.db.exec(`PRAGMA ${sql};`);
    } catch {}
  }

  prepare(sql) {
    const rawSql = sql.trim();
    const stmt = this.db.prepare(rawSql);
    const paramNames = [...rawSql.matchAll(/([@:$][a-zA-Z0-9_]+)/g)].map(m => m[1]);

    const normalizeParams = (params) => {
      if (params === undefined || params === null) return [];
      if (typeof params === 'object' && !Array.isArray(params)) {
        const obj = {};
        for (const p of paramNames) {
          const rawKey = p.slice(1);
          if (params[rawKey] !== undefined) obj[p] = params[rawKey];
          else if (params[p] !== undefined) obj[p] = params[p];
        }
        return [obj];
      }
      if (Array.isArray(params)) {
        return params;
      }
      return [params];
    };

    return {
      run(params) {
        const args = normalizeParams(params);
        return stmt.run(...args);
      },
      get(params) {
        const args = normalizeParams(params);
        return stmt.get(...args);
      },
      all(params) {
        const args = normalizeParams(params);
        return stmt.all(...args);
      }
    };
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      self.db.exec('BEGIN IMMEDIATE TRANSACTION;');
      try {
        const result = fn.apply(this, args);
        self.db.exec('COMMIT;');
        return result;
      } catch (err) {
        try { self.db.exec('ROLLBACK;'); } catch {}
        throw err;
      }
    };
  }

  close() {
    try {
      return this.db.close();
    } catch {}
  }
}

module.exports = NodeSqliteFallback;
