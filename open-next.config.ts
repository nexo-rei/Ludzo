import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// This file does two things:
// 1. Marks the project as already configured for OpenNext, so `wrangler deploy`
//    never triggers the adapter's auto-migrate (which used to inject an
//    UNGUARDED initOpenNextCloudflareForDev() into next.config.ts and crash
//    the build by starting workerd mid-build -> SQLITE_BUSY "database is locked").
// 2. buildCommand "next build": `opennextjs-cloudflare build` runs the Next.js
//    build via this command (default would be `npm run build`, which IS this
//    command -> infinite recursion, since our `build` script is the adapter).
export default {
  ...defineCloudflareConfig(),
  buildCommand: "next build",
};
