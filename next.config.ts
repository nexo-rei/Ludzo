import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Local Cloudflare bindings for the dev server only.
// MUST stay guarded: calling this during `next build` starts a workerd/
// miniflare instance mid-build and crashes with SQLITE_BUSY ("database is locked").
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Workers have no `/_next/image` optimizer unless the IMAGES binding is
    // configured — serve <Image> unoptimized instead of returning 500s.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "t.me" },
      { protocol: "https", hostname: "telegram.org" },
    ],
  },
};

export default nextConfig;
