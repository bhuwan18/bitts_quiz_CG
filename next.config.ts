import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow CrazyGames to embed the app in an iframe
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://crazygames.com https://*.crazygames.com",
          },
          // Clear X-Frame-Options so the CSP frame-ancestors directive takes precedence
          {
            key: "X-Frame-Options",
            value: "",
          },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      tailwindcss: path.resolve(__dirname, "node_modules/tailwindcss"),
    },
  },
  serverExternalPackages: ["@prisma/client", ".prisma/client", "web-push"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "i.imgflip.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
