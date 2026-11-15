import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const shimSrc = path.resolve(rootDir, 'packages/core/src/node-sqlite-shim.cjs');
if (!fs.existsSync(shimSrc)) {
  console.error('[patch-better-sqlite3] Shim source not found:', shimSrc);
  process.exit(1);
}

const shimContent = fs.readFileSync(shimSrc, 'utf8');

// Patch any better-sqlite3 instances in node_modules
const possibleTargets = [
  path.resolve(rootDir, 'node_modules/better-sqlite3'),
  path.resolve(rootDir, 'apps/payment-api/node_modules/better-sqlite3')
];

for (const targetDir of possibleTargets) {
  if (fs.existsSync(targetDir)) {
    const fallbackPath = path.resolve(targetDir, 'lib/node-sqlite-fallback.js');
    fs.writeFileSync(fallbackPath, shimContent, 'utf8');

    const dbJsPath = path.resolve(targetDir, 'lib/database.js');
    if (fs.existsSync(dbJsPath)) {
      let dbJs = fs.readFileSync(dbJsPath, 'utf8');
      if (!dbJs.includes('node-sqlite-fallback')) {
        const targetStr = `\t// Load the native addon\n\tlet addon;\n\tif (nativeBinding == null) {\n\t\taddon = DEFAULT_ADDON || (DEFAULT_ADDON = require('bindings')('better_sqlite3.node'));\n\t} else if (typeof nativeBinding === 'string') {`;
        const replaceStr = `\t// Load the native addon\n\tlet addon;\n\ttry {\n\t\tif (nativeBinding == null) {\n\t\t\taddon = DEFAULT_ADDON || (DEFAULT_ADDON = require('bindings')('better_sqlite3.node'));\n\t\t} else if (typeof nativeBinding === 'string') {`;
        
        if (dbJs.includes(targetStr)) {
          const endTargetStr = `\t\taddon = nativeBinding;\n\t}`;
          const endReplaceStr = `\t\taddon = nativeBinding;\n\t}\n\t} catch (err) {\n\t\tconst Fallback = require('./node-sqlite-fallback');\n\t\treturn new Fallback(filenameGiven, options);\n\t}`;
          
          dbJs = dbJs.replace(targetStr, replaceStr).replace(endTargetStr, endReplaceStr);
          fs.writeFileSync(dbJsPath, dbJs, 'utf8');
          console.log('[patch-better-sqlite3] Successfully patched:', dbJsPath);
        }
      }
    }
  }
}

// Also patch @berrysdk/store if present
const storeTargets = [
  path.resolve(rootDir, 'node_modules/@berrysdk/store/dist/index.js'),
  path.resolve(rootDir, 'apps/payment-api/node_modules/@berrysdk/store/dist/index.js')
];

for (const storeDist of storeTargets) {
  if (fs.existsSync(storeDist)) {
    let code = fs.readFileSync(storeDist, 'utf8');
    if (!code.includes('createStoreDb')) {
      const helperCode = `
import { DatabaseSync } from "node:sqlite";

function createStoreDb(path) {
    try {
        return new Database(path);
    } catch (e) {
        console.warn("[berrysdk/store] Falling back to node:sqlite DatabaseSync:", e.message);
        const resolvedPath = path === ":memory:" || !path ? ":memory:" : path;
        const db = new DatabaseSync(resolvedPath);
        return {
            exec(sql) { return db.exec(sql); },
            prepare(sql) {
                const rawSql = sql.trim();
                const stmt = db.prepare(rawSql);
                const paramNames = [...rawSql.matchAll(/([@:$][a-zA-Z0-9_]+)/g)].map(m => m[1]);
                const normalizeParams = (params) => {
                    if (params === undefined || params === null) return [];
                    if (typeof params === "object" && !Array.isArray(params)) {
                        const obj = {};
                        for (const p of paramNames) {
                            const rawKey = p.slice(1);
                            if (params[rawKey] !== undefined) obj[p] = params[rawKey];
                            else if (params[p] !== undefined) obj[p] = params[p];
                        }
                        return [obj];
                    }
                    if (Array.isArray(params)) return params;
                    return [params];
                };
                return {
                    run(params) { return stmt.run(...normalizeParams(params)); },
                    get(params) { return stmt.get(...normalizeParams(params)); },
                    all(params) { return stmt.all(...normalizeParams(params)); }
                };
            },
            transaction(fn) {
                return function(...args) {
                    db.exec("BEGIN IMMEDIATE TRANSACTION;");
                    try {
                        const res = fn.apply(this, args);
                        db.exec("COMMIT;");
                        return res;
                    } catch (err) {
                        try { db.exec("ROLLBACK;"); } catch {}
                        throw err;
                    }
                };
            },
            close() { try { return db.close(); } catch {} }
        };
    }
}
`;
      code = helperCode + code.replace('this.db = new Database(path);', 'this.db = createStoreDb(path);');
      fs.writeFileSync(storeDist, code, 'utf8');
      console.log('[patch-better-sqlite3] Successfully patched:', storeDist);
    }
  }
}

console.log('[patch-better-sqlite3] Patch step completed.');
