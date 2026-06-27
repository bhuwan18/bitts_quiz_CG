"use client";

import { useEffect } from "react";
import { initSDK, gameLoadingStart, gameLoadingStop } from "@/lib/crazygames-sdk";

export default function CrazyGamesProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSDK().then((ready) => {
      if (!ready) return;
      // Signal to CrazyGames that the app has started loading, then immediately
      // mark it done — Next.js SSR means the HTML is already on screen by
      // the time this client code runs.
      gameLoadingStart();
      gameLoadingStop();
    }).catch(() => {});
  }, []);

  return <>{children}</>;
}
