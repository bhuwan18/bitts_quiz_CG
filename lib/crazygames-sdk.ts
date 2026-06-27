declare global {
  interface Window {
    CrazyGames?: {
      SDK: {
        init(): Promise<void>;
        game: {
          gameLoadingStart(): void;
          gameLoadingStop(): void;
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

let _initPromise: Promise<boolean> | null = null;

/** Initialises the SDK once and caches the promise — safe to call from multiple components. */
export function initSDK(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve) => {
    const tryInit = () => {
      const sdk = getSDK();
      if (!sdk) { resolve(false); return; }
      sdk.init().then(() => resolve(true)).catch(() => resolve(false));
    };

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

  return _initPromise;
}

export function gameLoadingStart() {
  getSDK()?.game.gameLoadingStart();
}

export function gameLoadingStop() {
  getSDK()?.game.gameLoadingStop();
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
