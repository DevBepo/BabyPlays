import type { NextConfig } from "next";

const apiOrigin = (() => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return null;
  }

  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return null;
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
  }`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: https:${
    process.env.NODE_ENV === "development" && apiOrigin ? ` ${apiOrigin}` : ""
  }`,
  "media-src 'self' blob: https:",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""} https://viacep.com.br${
    process.env.NODE_ENV === "development" ? " ws: wss:" : ""
  }`,
].join("; ");

const hstsSeconds = (() => {
  const rawValue = process.env.FRONTEND_HSTS_SECONDS?.trim();

  if (!rawValue) {
    return 0;
  }

  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 0;
})();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "same-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  ...(hstsSeconds > 0
    ? [
        {
          key: "Strict-Transport-Security",
          value: `max-age=${hstsSeconds}`,
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
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
