"use client";

import { useEffect } from "react";
import { initSDK } from "@/lib/crazygames-sdk";

export default function CrazyGamesProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSDK().catch(() => {});
  }, []);

  return <>{children}</>;
}
