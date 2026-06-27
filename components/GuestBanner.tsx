"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { initSDK } from "@/lib/crazygames-sdk";
import Link from "next/link";

export default function GuestBanner() {
  const { status } = useSession();
  // null = not determined yet, true = inside CG, false = outside CG
  const [insideCG, setInsideCG] = useState<boolean | null>(null);

  useEffect(() => {
    initSDK().then((ready) => setInsideCG(ready)).catch(() => setInsideCG(false));
  }, []);

  if (status !== "unauthenticated") return null;

  // Inside CG: show the standard CG login prompt
  if (insideCG === true) {
    return (
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
        🎮 Log in to CrazyGames to save your progress, earn coins, and collect Quizlets
      </div>
    );
  }

  // Outside CG (admin / dev context): show a subtle admin login link
  if (insideCG === false) {
    return (
      <div className="sticky top-0 z-50 w-full flex items-center justify-center gap-3 px-4 py-2 text-xs text-gray-500" style={{ background: "var(--surface)" }}>
        <span>Running outside CrazyGames</span>
        <span className="opacity-30">·</span>
        <Link
          href="/login"
          className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
        >
          Admin login →
        </Link>
      </div>
    );
  }

  // Still initialising SDK — show nothing to avoid flash
  return null;
}
