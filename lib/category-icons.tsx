import type { ComponentType, CSSProperties, SVGProps } from "react";
import {
  Apple,
  Bath,
  Bone,
  BookOpen,
  Box,
  Brush,
  Bug,
  Carrot,
  CloudDrizzle,
  Container,
  Droplets,
  Egg,
  Fan,
  Fish,
  Flame,
  Flower,
  Gauge,
  Gift,
  HeartPulse,
  Lamp,
  LampCeiling,
  Leaf,
  Lightbulb,
  Mountain,
  Package,
  PawPrint,
  Percent,
  Pill,
  Plug,
  Rat,
  Shell,
  ShieldCheck,
  Shrub,
  Snail,
  Sparkles,
  SprayCan,
  Sprout,
  Star,
  Sun,
  Syringe,
  Tag,
  Thermometer,
  ThermometerSun,
  Timer,
  TreePalm,
  Trees,
  Truck,
  Turtle,
  Utensils,
  Waves,
  Wheat,
  Worm,
  Wrench,
} from "lucide-react";

/**
 * Ikony kategorií: předpřipravená sada (sloupec `category.icon` = klíč) nebo vlastní
 * nahraný obrázek (`category.icon_url`, má přednost). Bez obojího fallback na lístek.
 * Bez `server-only` — používá ji admin (výběr) i shop (menu, přehled kategorií).
 */

type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>;

/* ── Vlastní piktogramy ve stylu lucide (24×24, tah 2, kulaté konce) — lucide plazy nemá. ── */

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

const Snake: IconComponent = (p) => (
  <Svg {...p}>
    <path d="M3 20h8.5a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7H14" />
    <ellipse cx="17" cy="6" rx="3" ry="2.5" />
    <path d="M20 6h2" />
  </Svg>
);

const Gecko: IconComponent = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="4.5" rx="2.5" ry="2" />
    <ellipse cx="12" cy="11" rx="2.5" ry="4" />
    <path d="M12 15c0 3 1 5.5 4.5 6" />
    <path d="M9.8 9 6.5 8 5.5 5.5M14.2 9l3.3-1 1-2.5" />
    <path d="M9.8 13.5 6.5 15l-1 2.5m8.7-4 3.3 1.5 1 2.5" />
  </Svg>
);

const Frog: IconComponent = (p) => (
  <Svg {...p}>
    <circle cx="7.5" cy="7" r="2.5" />
    <circle cx="16.5" cy="7" r="2.5" />
    <path d="M5.5 8.5C4 10.5 4 15 6.5 17h11c2.5-2 2.5-6.5 1-8.5" />
    <path d="M9 12.5c2 1.3 4 1.3 6 0" />
    <path d="m6.5 17-2.5 3m13.5-3 2.5 3" />
  </Svg>
);

const Spider: IconComponent = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="14" r="3" />
    <circle cx="12" cy="9" r="1.5" />
    <path d="M9.4 12.5 6 9.5 3.5 10.5M9 14l-4-1-2.5 1.5M9.4 15.5 6 17l-1.5 3" />
    <path d="M14.6 12.5 18 9.5l2.5 1M15 14l4-1 2.5 1.5M14.6 15.5 18 17l1.5 3" />
  </Svg>
);

/* ── Katalog předpřipravených ikon (klíč se ukládá do DB — neměnit existující klíče) ── */

export type CategoryIconPreset = { key: string; label: string; Icon: IconComponent };

export const CATEGORY_ICON_GROUPS: { label: string; icons: CategoryIconPreset[] }[] = [
  {
    label: "Zvířata",
    icons: [
      { key: "snake", label: "Had", Icon: Snake },
      { key: "gecko", label: "Ještěr / gekon", Icon: Gecko },
      { key: "frog", label: "Žába / obojživelníci", Icon: Frog },
      { key: "spider", label: "Pavouk / bezobratlí", Icon: Spider },
      { key: "turtle", label: "Želva", Icon: Turtle },
      { key: "bug", label: "Hmyz", Icon: Bug },
      { key: "worm", label: "Červi", Icon: Worm },
      { key: "snail", label: "Šnek", Icon: Snail },
      { key: "rat", label: "Hlodavci", Icon: Rat },
      { key: "fish", label: "Ryby", Icon: Fish },
      { key: "egg", label: "Vejce / inkubace", Icon: Egg },
      { key: "paw-print", label: "Zvířata obecně", Icon: PawPrint },
    ],
  },
  {
    label: "Terária a technika",
    icons: [
      { key: "box", label: "Terárium", Icon: Box },
      { key: "container", label: "Box / faunárium", Icon: Container },
      { key: "lightbulb", label: "Žárovka", Icon: Lightbulb },
      { key: "lamp-ceiling", label: "Svítidlo", Icon: LampCeiling },
      { key: "lamp", label: "Lampa", Icon: Lamp },
      { key: "sun", label: "UV / slunce", Icon: Sun },
      { key: "thermometer-sun", label: "Vyhřívání", Icon: ThermometerSun },
      { key: "flame", label: "Topení", Icon: Flame },
      { key: "thermometer", label: "Teploměr", Icon: Thermometer },
      { key: "droplets", label: "Vlhkost / voda", Icon: Droplets },
      { key: "cloud-drizzle", label: "Mlžení / rosení", Icon: CloudDrizzle },
      { key: "waves", label: "Vodní část", Icon: Waves },
      { key: "fan", label: "Ventilace", Icon: Fan },
      { key: "plug", label: "Elektro", Icon: Plug },
      { key: "gauge", label: "Měření / regulace", Icon: Gauge },
      { key: "timer", label: "Časovače", Icon: Timer },
      { key: "wrench", label: "Příslušenství / díly", Icon: Wrench },
    ],
  },
  {
    label: "Dekorace a substráty",
    icons: [
      { key: "leaf", label: "Rostliny", Icon: Leaf },
      { key: "sprout", label: "Sazenice", Icon: Sprout },
      { key: "shrub", label: "Keř", Icon: Shrub },
      { key: "flower", label: "Květina", Icon: Flower },
      { key: "trees", label: "Dekorace / les", Icon: Trees },
      { key: "tree-palm", label: "Tropy", Icon: TreePalm },
      { key: "mountain", label: "Kameny / pozadí", Icon: Mountain },
      { key: "shell", label: "Úkryty / mušle", Icon: Shell },
      { key: "bone", label: "Kosti / dekor", Icon: Bone },
    ],
  },
  {
    label: "Krmivo a péče",
    icons: [
      { key: "utensils", label: "Krmivo", Icon: Utensils },
      { key: "carrot", label: "Zelenina", Icon: Carrot },
      { key: "apple", label: "Ovoce", Icon: Apple },
      { key: "wheat", label: "Granule / sušené", Icon: Wheat },
      { key: "pill", label: "Vitamíny", Icon: Pill },
      { key: "heart-pulse", label: "Zdraví", Icon: HeartPulse },
      { key: "syringe", label: "Veterina", Icon: Syringe },
      { key: "spray-can", label: "Čištění / dezinfekce", Icon: SprayCan },
      { key: "bath", label: "Koupání", Icon: Bath },
      { key: "brush", label: "Údržba", Icon: Brush },
    ],
  },
  {
    label: "Ostatní",
    icons: [
      { key: "package", label: "Balíčky / sety", Icon: Package },
      { key: "gift", label: "Dárky", Icon: Gift },
      { key: "book-open", label: "Literatura", Icon: BookOpen },
      { key: "tag", label: "Výprodej", Icon: Tag },
      { key: "percent", label: "Akce", Icon: Percent },
      { key: "sparkles", label: "Novinky", Icon: Sparkles },
      { key: "star", label: "Doporučujeme", Icon: Star },
      { key: "truck", label: "Doprava", Icon: Truck },
      { key: "shield-check", label: "Ochrana / bezpečnost", Icon: ShieldCheck },
    ],
  },
];

const PRESETS: Record<string, IconComponent> = Object.fromEntries(
  CATEGORY_ICON_GROUPS.flatMap((g) => g.icons.map((i) => [i.key, i.Icon])),
);

export const isCategoryIconKey = (key: string): boolean => key in PRESETS;

/**
 * Ikona kategorie. Vlastní obrázek se vykresluje jako CSS maska → přebírá barvu textu
 * (stejně jako lucide ikony), takže sedí k hover stavům menu. Proto nejlépe jednobarevné SVG/PNG
 * s průhledným pozadím.
 */
export function CategoryIcon({
  icon,
  iconUrl,
  className,
}: {
  icon?: string | null;
  iconUrl?: string | null;
  className?: string;
}) {
  if (iconUrl) {
    const mask = `url("${iconUrl.replace(/"/g, "%22")}") center / contain no-repeat`;
    return (
      <span
        aria-hidden="true"
        className={`inline-block bg-current ${className ?? ""}`}
        style={{ mask, WebkitMask: mask }}
      />
    );
  }
  const Icon = (icon && PRESETS[icon]) || Leaf;
  return <Icon className={className} />;
}
