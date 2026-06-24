import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Strip console.* calls (except console.error and console.warn) in production
  // builds to reduce bundle size and avoid leaking debug info to end users.
  // In development, all console.* calls are preserved.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
