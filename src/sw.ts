// @ts-ignore
import initSqlJs from '@jlongster/sql.js';
// @ts-ignore
import { SQLiteFS } from 'absurd-sql';
// @ts-ignore
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';
import sqlWASMUrl from '@jlongster/sql.js/dist/sql-wasm.wasm?url';
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
declare let self: ServiceWorkerGlobalScope;
self.skipWaiting();
clientsClaim();

async function init() {
  const SQL = await initSqlJs({ locateFile: () => sqlWASMUrl });
  const sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend());
  SQL.register_for_idb(sqlFS);

  SQL.FS.mkdir('/sql');
  SQL.FS.mount(sqlFS, {}, '/sql');

  const db = new SQL.Database('/sql/db.sqlite', { filename: true });
  db.exec(`
    PRAGMA page_size=8192;
    PRAGMA journal_mode=MEMORY;
  `);
  return db;
}

async function runQueries() {
  const db = await init();

  try {
    db.exec('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT)');
  } catch (e) {}

  db.exec('BEGIN TRANSACTION');
  let stmt = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)');
  for (let i = 0; i < 5; i++) {
    stmt.run([i, ((Math.random() * 100) | 0).toString()]);
  }
  stmt.free();
  db.exec('COMMIT');

  stmt = db.prepare(`SELECT SUM(value) FROM kv`);
  stmt.step();
  console.log('Result:', stmt.getAsObject());
  stmt.free();
}

runQueries();
