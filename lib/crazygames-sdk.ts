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
          addEventHandler(event: "mute" | "unmute", callback: () => void): void;
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

/**
 * Shows a midgame ad. Always resolves so the game continues.
 * Calls onMute when the ad starts and onUnmute when it ends/errors.
 */
export function showMidgameAd(onMute?: () => void, onUnmute?: () => void): Promise<void> {
  return new Promise((resolve) => {
    const sdk = getSDK();
    if (!sdk) { resolve(); return; }
    sdk.ad.requestAd("midgame", {
      adStarted: () => onMute?.(),
      adFinished: () => { onUnmute?.(); resolve(); },
      adError: () => { onUnmute?.(); resolve(); },
    });
  });
}

/** Register a callback for when the CrazyGames platform mutes the game. */
export function onSDKMute(callback: () => void) {
  getSDK()?.game.addEventHandler("mute", callback);
}

/** Register a callback for when the CrazyGames platform unmutes the game. */
export function onSDKUnmute(callback: () => void) {
  getSDK()?.game.addEventHandler("unmute", callback);
}

export async function getCGUserToken(): Promise<string | null> {
  try {
    return await getSDK()?.user.getUserToken() ?? null;
  } catch {
    return null;
  }
}
