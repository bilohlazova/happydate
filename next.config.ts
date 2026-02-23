import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    esmExternals: "loose",
  },

  async redirects() {
    return [
      {
        source: "/services/wiadomosc-z-nieba/plan/:slug",
        destination: "/services/wiadomosc-z-nieba/plans/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;