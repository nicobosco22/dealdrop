import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the local database) must load as a normal Node package, not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
