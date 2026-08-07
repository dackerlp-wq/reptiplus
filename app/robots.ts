import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/** robots.txt — neindexovat admin, pokladnu, účet a další privátní/technické cesty. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/admin",
        "/*/pokladna",
        "/*/kosik",
        "/*/ucet",
        "/*/faktura",
        "/*/objednavka",
        "/*/prihlaseni",
        "/*/registrace",
        "/*/obnova-hesla",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
