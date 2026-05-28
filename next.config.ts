import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained `server.js` + minimal node_modules tree at
  // `.next/standalone/`. The Dockerfile copies that tree into a slim runtime
  // image (~150 MB vs ~1 GB for a full `npm ci` image). Vercel ignores this
  // setting -- it's only consumed by the Docker build.
  output: "standalone",

  // Next 16 dev server blocks cross-origin asset / HMR requests by default.
  // Supabase Auth's `site_url` fallback can land users on 127.0.0.1:3000 even
  // when the dev server intends to serve from localhost:3000 (or vice versa);
  // the resulting host mismatch leaves React unhydrated and client components
  // (like the magic-link form) appear inert. Allow both so dev works from
  // either hostname.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
