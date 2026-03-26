import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow hot-reloading from local LAN IP for mobile testing
  allowedDevOrigins: ["192.168.31.127", "localhost"],
};

export default nextConfig;
