"use client";

import { useAudio } from "@/lib/audio-context";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { initSDK, onSDKMute, onSDKUnmute } from "@/lib/crazygames-sdk";

export default function AudioPlayer() {
  const { enabled, volume, playing, toggle, setVolume, pause, resume } = useAudio();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const prevPausedRef = useRef(false);

  // Register CrazyGames platform mute/unmute handlers once SDK is ready
  useEffect(() => {
    initSDK().then((ready) => {
      if (!ready) return;
      onSDKMute(pause);
      onSDKUnmute(resume);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pause during quiz play pages (/quiz/[id])
  useEffect(() => {
    const isQuiz = /^\/quiz\/[^/]+$/.test(pathname);
    if (isQuiz && !prevPausedRef.current) {
      pause();
      prevPausedRef.current = true;
    } else if (!isQuiz && prevPausedRef.current) {
      resume();
      prevPausedRef.current = false;
    }
  }, [pathname, pause, resume]);

  const isQuizPage = /^\/quiz\/[^/]+$/.test(pathname);

  return (
    <div className="fixed bottom-20 md:bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Expanded controls */}
      {expanded && (
        <div
          className="rounded-2xl p-4 shadow-xl border text-sm"
          style={{
            background: "var(--surface, #110d2a)",
            borderColor: "var(--border, #2d1f5e)",
            color: "var(--text-base, #f0f0ff)",
            minWidth: 200,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-xs uppercase tracking-wide opacity-60">Music</span>
            {isQuizPage && (
              <span className="text-xs text-yellow-500/80">Paused during quiz</span>
            )}
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-xs opacity-50 w-8 text-right">{Math.round(volume * 100)}%</span>
          </div>

          {/* Toggle */}
          <button
            onClick={toggle}
            className="w-full py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: enabled ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
              color: enabled ? "#fbbf24" : "#6b7280",
              border: `1px solid ${enabled ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {enabled ? "🎵 Music ON" : "🔕 Music OFF"}
          </button>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setExpanded((v) => !v)}
        title="Music controls"
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{
          background: enabled && playing ? "var(--accent)" : "var(--surface)",
          border: `1px solid ${enabled && playing ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"}`,
          boxShadow: enabled && playing ? "0 0 14px rgba(245,158,11,0.4)" : undefined,
        }}
      >
        <span className="text-xl">{enabled && playing ? "🎵" : "🔕"}</span>
      </button>
    </div>
  );
}
