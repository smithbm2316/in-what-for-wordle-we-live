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

    // TODO: Host a base db that I generate from a Github Action daily on Github Pages, so that I
    // can just fetch that instead of sending down the JSON and running all setup code
    // loading a remote db: https://sql.js.org/#/?id=loading-a-database-from-a-server
    // hosting the base db on gh pages: https://phiresky.github.io/blog/2021/hosting-sqlite-databases-on-github-pages/
    // saving the remote db locally: https://github.com/jlongster/absurd-sql/discussions/48
    // const data = await fetch("gh-pages-link-here").then(res => res.arrayBuffer());
    // db = new SQL.Database(new Uint8Array(data), { filename: true });
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

// Handle messages from the main thread/app
self.addEventListener('message', (e: ExtendableMessageEvent) => {
  const { data } = e.data;
  if ('person' in data) {
    runTestQueries();
  }
});
