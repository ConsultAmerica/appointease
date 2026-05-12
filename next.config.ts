import type { NextConfig } from "next";

/**
 * Next.js 16 blocks cross-origin dev requests (e.g. HMR) from LAN IPs by default.
 * Set ALLOWED_DEV_ORIGINS in .env to a comma-separated list of hostnames (no scheme/port),
 * e.g. `192.168.0.193` when you open the app at http://192.168.0.193:3000
 */
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS?.trim()
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : ["192.168.0.193"];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
