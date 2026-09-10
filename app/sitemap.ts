import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { routing } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600; // přegenerovat max jednou za hodinu

type Entry = MetadataRoute.Sitemap[number];

/** Jeden záznam pro cestu (bez jazyka) se všemi jazykovými variantami. */
function entry(
  path: string,
  opts: { lastModified?: string | Date; changeFrequency?: Entry["changeFrequency"]; priority?: number } = {},
): Entry[] {
  const clean = path.replace(/^\/+/, "");
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = absoluteUrl(`/${l}${clean ? `/${clean}` : ""}`);
  }
  return routing.locales.map((l) => ({
    url: absoluteUrl(`/${l}${clean ? `/${clean}` : ""}`),
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const svc = createServiceClient();
  const [{ data: products }, { data: categories }, { data: ledxLines }] =
    await Promise.all([
      svc
        .from("product")
        .select("slug, updated_at")
        .eq("is_published", true),
      svc.from("category").select("slug").eq("is_published", true),
      svc.from("ledx_line").select("slug").eq("is_published", true),
    ]);

  const staticPaths: [string, number, Entry["changeFrequency"]][] = [
    ["", 1.0, "daily"],
    ["produkty", 0.9, "daily"],
    ["kategorie", 0.8, "weekly"],
    ["kategorie/profi-osvetleni", 0.7, "weekly"],
    ["o-nas", 0.4, "monthly"],
    ["obchodni-podminky", 0.3, "yearly"],
    ["reklamacni-rad", 0.3, "yearly"],
    ["ochrana-osobnich-udaju", 0.3, "yearly"],
  ];

  const entries: Entry[] = [
    ...staticPaths.flatMap(([p, priority, changeFrequency]) =>
      entry(p, { priority, changeFrequency }),
    ),
    // profi-osvetleni má vlastní stránku (výše), případnou stejnojmennou kategorii přeskočíme
    ...(categories ?? [])
      .filter((c) => c.slug !== "profi-osvetleni")
      .flatMap((c) =>
        entry(`kategorie/${c.slug}`, { priority: 0.7, changeFrequency: "weekly" }),
      ),
    ...(ledxLines ?? []).flatMap((l) =>
      entry(`kategorie/profi-osvetleni/${l.slug}`, {
        priority: 0.6,
        changeFrequency: "monthly",
      }),
    ),
    ...(products ?? []).flatMap((p) =>
      entry(`produkt/${p.slug}`, {
        lastModified: p.updated_at ?? undefined,
        priority: 0.8,
        changeFrequency: "weekly",
      }),
    ),
  ];

  return entries;
}
