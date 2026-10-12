import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* This app is an authenticated internal system — essentially every page
     reads cookies (auth session / locale) and is inherently dynamic, so
     Cache Components' static-by-default prerendering doesn't fit and
     breaks the auto-generated /_not-found route. Turned off rather than
     wrapping every layout in Suspense boundaries for no real benefit. */
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
