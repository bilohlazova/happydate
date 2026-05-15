const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
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