declare global {
  interface Window {
    CrazyGames?: {
      SDK: {
        init(): Promise<void>;
        environment: "initialized" | "uninitialized" | "disabled";
        game: {
          loadingStart(): void;
          loadingStop(): void;
          gameplayStart(): void;
          gameplayStop(): void;
          settings: { muteAudio: boolean; disableChat: boolean };
          addSettingsChangeListener(callback: (settings: { muteAudio: boolean; disableChat: boolean }) => void): void;
          removeSettingsChangeListener(callback: (settings: { muteAudio: boolean; disableChat: boolean }) => void): void;
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
      try {
        sdk.init()
          .then(() => {
            // sdk.init() can resolve even on disabled domains, but leaves
            // environment !== "initialized" and submodule getters throw.
            resolve(sdk.environment === "initialized");
          })
          .catch(() => resolve(false));
      } catch {
        resolve(false);
      }
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
  getSDK()?.game.loadingStart();
}

export function gameLoadingStop() {
  getSDK()?.game.loadingStop();
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

/**
 * Registers a listener for the CrazyGames platform audio toggle.
 * The callback receives true when muted, false when unmuted.
 * Returns a cleanup function to remove the listener.
 */
export function onSDKAudioChange(callback: (muteAudio: boolean) => void): () => void {
  const sdk = getSDK();
  if (!sdk?.game) return () => {};
  const handler = (settings: { muteAudio: boolean }) => callback(settings.muteAudio);
  sdk.game.addSettingsChangeListener(handler);
  return () => sdk.game.removeSettingsChangeListener(handler);
}

/** Returns the CrazyGames user token if the user is logged in to CrazyGames, or null. */
export async function getCGUserToken(): Promise<string | null> {
  try {
    const sdk = getSDK();
    if (!sdk) return null;
    if (!sdk.user.isUserAccountAvailable) return null;
    return await sdk.user.getUserToken() ?? null;
  } catch {
    return null;
  }
}
