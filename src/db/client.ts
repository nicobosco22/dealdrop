// Opens the database.
// On your own computer this is PGlite: a real Postgres that lives in the .data/ folder,
// so there is nothing to sign up for. When we go online we switch to hosted Postgres
// using DATABASE_URL (same tables, same queries).

import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export type Db = PgliteDatabase<typeof schema>;

/** Open a database and make sure its tables exist. Pass no folder for a throwaway in-memory one (tests). */
export async function openDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

// Keep one database open for the whole app. PGlite allows only one opener,
// and Next.js reloads code while you edit, so we park it on globalThis.
const globalForDb = globalThis as unknown as { dealdropDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.dealdropDb ??= openDb(path.join(process.cwd(), ".data", "pglite")).catch((err) => {
    // If opening failed, forget it so the next page load tries again.
    globalForDb.dealdropDb = undefined;
    throw err;
  });
  return globalForDb.dealdropDb;
}
