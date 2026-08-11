import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/gullar", destination: "/ru/catalog", permanent: true },
      {
        source: "/gullar/:slug",
        destination: "/ru/products/:slug",
        permanent: true,
      },
      { source: "/buyurtma", destination: "/ru/checkout", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
