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
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
