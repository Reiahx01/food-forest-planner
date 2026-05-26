import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained `server.js` + minimal node_modules tree at
  // `.next/standalone/`. The Dockerfile copies that tree into a slim runtime
  // image (~150 MB vs ~1 GB for a full `npm ci` image). Vercel ignores this
  // setting -- it's only consumed by the Docker build.
  output: "standalone",
};

export default nextConfig;
