"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { initSDK, getCGUserToken } from "@/lib/crazygames-sdk";

/**
 * Runs once on app load. If the CrazyGames SDK is available and the user is
 * logged into their CrazyGames account, silently signs them into BittsQuiz
 * using the CrazyGames token. No-ops when running outside the CG iframe.
 */
export default function CrazyGamesAuthProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  useEffect(() => {
    // Only attempt when there is definitely no active session
    if (status !== "unauthenticated") return;

    (async () => {
      const ready = await initSDK();
      if (!ready) {
        console.log("[CG auth] SDK not ready — running outside CrazyGames");
        return;
      }

      const token = await getCGUserToken();
      if (!token) {
        console.log("[CG auth] No user token — user not logged into CrazyGames");
        return;
      }

      console.log("[CG auth] Got user token, attempting sign-in…");
      const result = await signIn("crazygames", { token, redirect: false });
      console.log("[CG auth] signIn result:", JSON.stringify(result));
    })().catch((e) => {
      console.error("[CG auth] unexpected error during auto-login:", e);
    });
  }, [status]);

  return <>{children}</>;
}
