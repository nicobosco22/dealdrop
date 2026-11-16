import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the local database) must load as a normal Node package, not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The SQL files that create the tables are read when the site starts,
  // so they must be shipped with it when it is deployed.
  outputFileTracingIncludes: { "/*": ["./drizzle/**/*"] },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
