declare global {
  interface Window {
    CrazyGames?: {
      SDK: {
        init(): Promise<void>;
        game: {
          gameplayStart(): void;
          gameplayStop(): void;
        };
        ad: {
          requestAd(
            type: "midgame" | "rewarded",
            callbacks: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (error: unknown) => void;
            }
          ): void;
        };
        user: {
          isUserAccountAvailable: boolean;
          getUserToken(): Promise<string | null>;
        };
      };
    };
  }
}

function getSDK() {
  return typeof window !== "undefined" ? window.CrazyGames?.SDK ?? null : null;
}

/** Call once on app load. Resolves true when SDK is ready, false if unavailable. */
export function initSDK(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }

    const tryInit = () => {
      const sdk = getSDK();
      if (!sdk) { resolve(false); return; }
      sdk.init().then(() => resolve(true)).catch(() => resolve(false));
    };

    // SDK script may not have executed yet — poll briefly
    if (window.CrazyGames?.SDK) {
      tryInit();
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.CrazyGames?.SDK) {
          clearInterval(interval);
          tryInit();
        } else if (attempts >= 50) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    }
  });
}

export function gameplayStart() {
  getSDK()?.game.gameplayStart();
}

export function gameplayStop() {
  getSDK()?.game.gameplayStop();
}

/** Shows a midgame ad. Always resolves (even on error) so the game continues. */
export function showMidgameAd(): Promise<void> {
  return new Promise((resolve) => {
    const sdk = getSDK();
    if (!sdk) { resolve(); return; }
    sdk.ad.requestAd("midgame", {
      adFinished: resolve,
      adError: () => resolve(),
    });
  });
}

export async function getCGUserToken(): Promise<string | null> {
  try {
    return await getSDK()?.user.getUserToken() ?? null;
  } catch {
    return null;
  }
}
