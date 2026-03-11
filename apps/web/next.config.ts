import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  transpilePackages: ["@comtouz/domain", "@comtouz/graph", "@comtouz/cache", "@comtouz/security"],
  typedRoutes: true
};

export default nextConfig;