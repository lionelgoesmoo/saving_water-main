import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
              "worker-src 'self' blob:",
              "connect-src 'self' https://*.cartocdn.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://services.arcgisonline.com http://localhost:8000 https://saving-water.onrender.com",
              "img-src 'self' data: blob: https://*.cartocdn.com https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://maps.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://*.cartocdn.com https://basemaps.cartocdn.com",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
