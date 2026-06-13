import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.babyplays.com.br",
      },
      {
        protocol: "https",
        hostname: "api-babyplays.up.railway.app",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },
  reactCompiler: true,
};

export default nextConfig;