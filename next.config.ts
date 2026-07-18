import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
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

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
