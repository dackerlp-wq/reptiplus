import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "duaihkobtgfzprufqjmh.supabase.co" },
    ],
  },
  experimental: {
    // Upload fotek přes Server Action — zvednout z výchozího 1 MB.
    // Fotky se navíc komprimují už v prohlížeči, takže bývají výrazně menší.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default withNextIntl(nextConfig);
