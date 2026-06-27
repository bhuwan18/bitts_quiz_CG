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
      if (!ready) return; // not in CrazyGames iframe

      const token = await getCGUserToken();
      if (!token) return; // user not logged into CrazyGames — guest mode

      await signIn("crazygames", { token, redirect: false });
    })().catch(() => {});
  }, [status]);

  return <>{children}</>;
}
