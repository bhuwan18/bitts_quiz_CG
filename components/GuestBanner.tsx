"use client";

import { useSession } from "next-auth/react";

export default function GuestBanner() {
  const { status } = useSession();
  if (status !== "unauthenticated") return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
      🎮 Log in to CrazyGames to save your progress, earn coins, and collect Quizlets
    </div>
  );
}
