// Opens the database. There are two kinds, and the rest of the app cannot tell them apart:
//
//  - On your own computer (DATABASE_URL is blank): PGlite, a real Postgres that lives
//    in the .data/ folder. Nothing to sign up for.
//  - Online (DATABASE_URL is set): a hosted Postgres database, such as Neon.
//
// Either way, the tables are created or updated automatically the first time it opens.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleHosted } from "drizzle-orm/node-postgres";
import { migrate as migrateHosted } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle as drizzleLocal } from "drizzle-orm/pglite";
import { migrate as migrateLocal } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

// Both kinds of database share this shape, so every query works with both.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, typeof schema>;

const migrationsFolder = () => path.join(process.cwd(), "drizzle");

/** Open a local database. Pass no folder for a throwaway in-memory one (tests). */
export async function openDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const db = drizzleLocal(new PGlite(dataDir), { schema });
  await migrateLocal(db, { migrationsFolder: migrationsFolder() });
  return db;
}

/** Open the hosted database named by a connection string. */
export async function openHostedDb(connectionString: string): Promise<{ db: Db; close: () => Promise<void> }> {
  // A small pool: hosted free plans allow only a few connections at once.
  const pool = new Pool({ connectionString, max: 3 });
  const db = drizzleHosted(pool, { schema });
  await migrateHosted(db, { migrationsFolder: migrationsFolder() });
  return { db, close: () => pool.end() };
}

// Keep one database open for the whole app. PGlite allows only one opener,
// and Next.js reloads code while you edit, so we park it on globalThis.
const globalForDb = globalThis as unknown as { dealdropDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  const open = url
    ? () => openHostedDb(url).then((hosted) => hosted.db)
    : () => openDb(path.join(process.cwd(), ".data", "pglite"));

  globalForDb.dealdropDb ??= open().catch((err) => {
    // If opening failed, forget it so the next page load tries again.
    globalForDb.dealdropDb = undefined;
    throw err;
  });
  return globalForDb.dealdropDb;
}
