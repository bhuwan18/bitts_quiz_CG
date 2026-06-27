"use client";
import { useState, useEffect } from "react";
import {
  STREAK_FREEZE_COST_1,
  STREAK_FREEZE_COST_2,
  STREAK_FREEZE_MAX,
} from "@/lib/game-config";

// ─── Streak Freeze ─────────────────────────────────────────────────────────────

type StreakInfo = { coins: number; currentStreak: number; longestStreak: number; streakFreezes: number } | null;

function StreakFreezeTab() {
  const [info, setInfo] = useState<StreakInfo>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchInfo = async () => {
    try {
      const res = await fetch("/api/user/buy-streak-freeze");
      if (res.ok) setInfo(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInfo(); }, []);

  const handleBuy = async () => {
    setBuying(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/buy-streak-freeze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Purchase failed" });
      } else {
        setMessage({ type: "success", text: `Streak freeze purchased! You now have ${data.streakFreezes} freeze${data.streakFreezes !== 1 ? "s" : ""}. ${data.coinsSpent} coins deducted.` });
        setInfo((prev) => prev ? { ...prev, streakFreezes: data.streakFreezes, coins: data.coinsRemaining } : null);
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setBuying(false);
    }
  };

  const freezes = info?.streakFreezes ?? 0;
  const coins = info?.coins ?? 0;
  const nextCost = freezes === 0 ? STREAK_FREEZE_COST_1 : STREAK_FREEZE_COST_2;
  const canBuy = freezes < STREAK_FREEZE_MAX && coins >= nextCost;

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🧊</div>
        <h2 className="text-2xl font-bold text-white mb-2">Streak Freezes</h2>
        <p className="text-gray-400">Protect your streak when life gets in the way. Freezes auto-apply when you miss a day.</p>
      </div>

      {!loading && info && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">🔥 {info.currentStreak}</p>
            <p className="text-xs text-gray-500 mt-1">current streak</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">⭐ {info.longestStreak}</p>
            <p className="text-xs text-gray-500 mt-1">best streak</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">🧊 {freezes}</p>
            <p className="text-xs text-gray-500 mt-1">freezes owned</p>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {([
          { slot: 1, cost: STREAK_FREEZE_COST_1, label: "First Freeze" },
          { slot: 2, cost: STREAK_FREEZE_COST_2, label: "Second Freeze" },
        ] as const).map(({ slot, cost, label }) => {
          const owned = freezes >= slot;
          return (
            <div key={slot} className={`border rounded-2xl p-5 flex items-center justify-between gap-4 ${owned ? "bg-cyan-500/10 border-cyan-500/40" : "bg-white/5 border-white/10"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${owned ? "border-cyan-500/50 bg-cyan-500/20" : "border-white/10 bg-white/5"}`}>
                  {owned ? "🧊" : "🔒"}
                </div>
                <div>
                  <p className="text-white font-semibold">{label}</p>
                  <p className="text-xs text-gray-400">{owned ? "Owned" : `${cost.toLocaleString()} coins`}</p>
                </div>
              </div>
              {owned ? (
                <span className="text-cyan-400 text-sm font-semibold">✓ Active</span>
              ) : (
                <span className="text-gray-500 text-sm font-mono">{cost.toLocaleString()} 🪙</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-2">
        <p className="text-sm font-semibold text-white mb-3">How streak freezes work</p>
        <div className="flex items-start gap-2.5 text-sm text-gray-400">
          <span className="text-cyan-400 shrink-0">✓</span>
          <span>If you miss a day, one freeze is automatically consumed to keep your streak alive</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm text-gray-400">
          <span className="text-cyan-400 shrink-0">✓</span>
          <span>You can own a maximum of {STREAK_FREEZE_MAX} freezes at a time</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm text-gray-400">
          <span className="text-yellow-400 shrink-0">⚡</span>
          <span>Freezes only cover one missed day each — gaps of 2+ days will break your streak unless you have enough freezes</span>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-4 mb-4 text-sm text-center ${message.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
          {message.text}
        </div>
      )}

      {freezes < STREAK_FREEZE_MAX ? (
        <button
          onClick={handleBuy}
          disabled={buying || loading || !canBuy}
          className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all"
        >
          {buying ? "Purchasing..." : `Buy ${freezes === 0 ? "1st" : "2nd"} Freeze — ${nextCost.toLocaleString()} 🪙`}
        </button>
      ) : (
        <div className="w-full py-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold text-center rounded-xl">
          🧊 Maximum freezes owned ({STREAK_FREEZE_MAX}/{STREAK_FREEZE_MAX})
        </div>
      )}

      {!canBuy && freezes < STREAK_FREEZE_MAX && !loading && (
        <p className="text-center text-xs text-red-400 mt-2">
          Need {(nextCost - coins).toLocaleString()} more coins to buy this freeze.
        </p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  return (
    <div className="p-4 pb-20 md:p-8 md:pb-0 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">🏪 Shop</h1>
        <p className="text-gray-400 mt-1">Protect your streak with coin-purchased freezes</p>
      </div>

      {/* Membership / coins notice */}
      <div className="mb-8 p-5 rounded-2xl border border-white/10 bg-white/5 flex items-start gap-4">
        <span className="text-3xl shrink-0">🎮</span>
        <div>
          <p className="text-white font-semibold mb-1">Membership &amp; coin purchases</p>
          <p className="text-gray-400 text-sm">Pro, Max, and coin top-ups are not available in the CrazyGames version. Earn coins by playing quizzes!</p>
        </div>
      </div>

      <StreakFreezeTab />
    </div>
  );
}
