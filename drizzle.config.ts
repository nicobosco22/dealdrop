import { defineConfig } from "drizzle-kit";

// Tells drizzle-kit where the tables are described and where to write the SQL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
