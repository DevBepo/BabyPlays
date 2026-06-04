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
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
