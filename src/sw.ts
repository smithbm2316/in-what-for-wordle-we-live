// @ts-ignore
import initSqlJs from '@jlongster/sql.js';
// @ts-ignore
import { SQLiteFS } from 'absurd-sql';
// @ts-ignore
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';
import sqlWASMUrl from '@jlongster/sql.js/dist/sql-wasm.wasm?url';
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import type { Database } from 'sql.js';

declare let self: ServiceWorkerGlobalScope;

// Workbox setup to handle caching of routes and auto-updating of the service worker
// Caching/pre-caching of routes
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// Necessary for auto-update functionality
self.skipWaiting();
clientsClaim();

// Create a global variable to handle the sqlite database object
let db: Database;

// Initialize the database with the WASM file and absurd-sql setup
// As well as initial PRAGMA settings for the db
initSqlJs({ locateFile: () => sqlWASMUrl })
  .then((SQL: any) => {
    const sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend());
    SQL.register_for_idb(sqlFS);
    SQL.FS.mkdir('/sql');
    SQL.FS.mount(sqlFS, {}, '/sql');

    db = new SQL.Database('/sql/db.sqlite', { filename: true });
    db.exec(`
      PRAGMA page_size=8192;
      PRAGMA journal_mode=MEMORY;
      PRAGMA foreign_keys=ON;
      PRAGMA busy_timeout=5000;
    `);
  })
  .catch((err: Error) => console.log(err));

// Test queries from the absurd-sql project example
function runTestQueries() {
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

// TODO: could I host the base sqlite DB on Github Pages after running a daily github action to
// update the base DB? That way I could just send down the sqlite file to the client and load that
// into the device...🤔
// YES this might be a good idea: https://sql.js.org/#/?id=loading-a-database-from-a-server
// hosting a sqlite db on github pages: https://phiresky.github.io/blog/2021/hosting-sqlite-databases-on-github-pages/

// Handle messages from the main thread/app
self.addEventListener('message', (e) => {
  // console.log('Service worker received data', e?.data);
  if (e?.data?.person) {
    runTestQueries();
  }
});
