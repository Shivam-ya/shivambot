import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow hot-reloading from local LAN IP for mobile testing
  allowedDevOrigins: ["192.168.31.127", "10.82.215.55", "localhost"],
};

export default nextConfig;
