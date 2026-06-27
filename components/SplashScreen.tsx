import { getWeeklyOffers, type WeeklyOfferType } from "@/lib/app-settings";
import { getTodaysFestival } from "@/lib/festivals";
import { PACKS_DATA } from "@/lib/packs-data";
import { PRO_AMOUNT_INR, MAX_AMOUNT_INR, DAILY_RESET_AMOUNT_INR } from "@/lib/game-config";
import SplashScreenClient, { type SplashPromo, type SplashFestival } from "./SplashScreenClient";

const OFFER_META: Record<WeeklyOfferType, {
  icon: string;
  title: (pct: number) => string;
  description: (pct: number) => string;
  colorFrom: string;
  colorTo: string;
  link: string;
}> = {
  pro: {
    icon: "⭐",
    title: (pct) => `${pct}% Off Pro Membership`,
    description: (pct) => `Get Pro for ₹${Math.round(PRO_AMOUNT_INR * (1 - pct / 100))} this week — normally ₹${PRO_AMOUNT_INR}/month.`,
    colorFrom: "from-violet-500",
    colorTo: "to-purple-700",
    link: "/shop",
  },
  max: {
    icon: "👑",
    title: (pct) => `${pct}% Off Max Membership`,
    description: (pct) => `Get Max for ₹${Math.round(MAX_AMOUNT_INR * (1 - pct / 100))} this week — normally ₹${MAX_AMOUNT_INR}/month.`,
    colorFrom: "from-amber-500",
    colorTo: "to-orange-600",
    link: "/shop",
  },
  daily_reset: {
    icon: "🔄",
    title: (pct) => `${pct}% Off Daily Reset`,
    description: (pct) => `Reset your daily coin limit for just ₹${Math.round(DAILY_RESET_AMOUNT_INR * (1 - pct / 100))} this week — normally ₹${DAILY_RESET_AMOUNT_INR}.`,
    colorFrom: "from-emerald-500",
    colorTo: "to-teal-600",
    link: "/shop",
  },
  coins: {
    icon: "🪙",
    title: (pct) => `${pct}% Bonus Coins`,
    description: (pct) => `Buy coins this week and get ${pct}% extra — limited time!`,
    colorFrom: "from-yellow-500",
    colorTo: "to-amber-600",
    link: "/shop",
  },
};

export default async function SplashScreen() {
  let weeklyOffers: Awaited<ReturnType<typeof getWeeklyOffers>> = {};
  try {
    weeklyOffers = await getWeeklyOffers();
  } catch {
    // DB unavailable — render without offers rather than crashing the layout
  }
  const festival = getTodaysFestival();

  const promos: SplashPromo[] = (Object.entries(weeklyOffers) as [WeeklyOfferType, { discountPercent: number }][])
    .filter(([type]) => type in OFFER_META)
    .map(([type, offer]) => {
      const meta = OFFER_META[type];
      return {
        id: `weekly-${type}`,
        badge: `${offer.discountPercent}% OFF`,
        title: meta.title(offer.discountPercent),
        description: meta.description(offer.discountPercent),
        icon: meta.icon,
        link: meta.link,
        colorFrom: meta.colorFrom,
        colorTo: meta.colorTo,
      };
    });

  let splashFestival: SplashFestival | null = null;
  if (festival) {
    const pack = PACKS_DATA.find((p) => p.slug === festival.packSlug) ?? null;
    splashFestival = {
      name: festival.name,
      icon: festival.icon,
      packColor: pack ? { from: pack.colorFrom, to: pack.colorTo } : undefined,
    };
  }

  return <SplashScreenClient promos={promos} festival={splashFestival} />;
}
