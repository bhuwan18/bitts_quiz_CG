"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { initSDK, getCGUserToken } from "@/lib/crazygames-sdk";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showAdmin, setShowAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cgLoading, setCgLoading] = useState(false);

  useEffect(() => {
    if (session) { router.replace("/dashboard"); return; }

    // Attempt CrazyGames SSO automatically when landing on this page
    setCgLoading(true);
    initSDK()
      .then(async (ready) => {
        if (!ready) { setCgLoading(false); return; }
        const token = await getCGUserToken();
        if (!token) { setCgLoading(false); return; }
        await signIn("crazygames", { token, redirect: false });
        router.replace("/dashboard");
      })
      .catch(() => setCgLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAdminError("");
    const result = await signIn("admin-credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setAdminError("Invalid username or password.");
    } else {
      router.replace("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--main-bg)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-yellow-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full">
        {/* Logo */}
        <div className="text-center">
          <div className="text-7xl mb-4 float-anim inline-block">⚡</div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Bitts<span className="text-[var(--accent)]">Quiz</span>
          </h1>
          <p className="mt-3 text-gray-400 text-lg font-medium">
            Quiz. Collect. Conquer.
          </p>
        </div>

        {/* Feature list */}
        <div className="w-full rounded-2xl p-6 space-y-3 border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {[
            { icon: "🧠", text: "Answer quizzes across 10 categories" },
            { icon: "🪙", text: "Earn coins for every correct answer" },
            { icon: "🎴", text: "Open packs to collect rare Quizlets" },
            { icon: "⚔️", text: "Compete in multiplayer game modes" },
            { icon: "🏆", text: "Climb the leaderboard and win" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-gray-300">
              <span className="text-xl">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* CrazyGames SSO */}
        <div className="w-full rounded-2xl p-5 border border-white/10 bg-white/5 text-center">
          <div className="text-3xl mb-2">🎮</div>
          <p className="text-white font-semibold mb-1">Sign in with CrazyGames</p>
          <p className="text-gray-400 text-sm">Use your CrazyGames account to save progress, earn coins, and collect Quizlets.</p>
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm">
            {cgLoading ? (
              <span className="text-indigo-400 animate-pulse">Signing in with CrazyGames...</span>
            ) : (
              <span className="text-gray-500">Log in to CrazyGames to play with your account</span>
            )}
          </div>
        </div>

        {!showAdmin ? (
          <button
            onClick={() => { setShowAdmin(true); setUsername(""); setPassword(""); }}
            className="text-xs text-gray-700 hover:text-purple-400 transition-colors"
          >
            Admin login
          </button>
        ) : (
          <form onSubmit={handleAdminLogin} className="w-full space-y-4">
            <div className="text-center mb-2">
              <span className="text-sm font-semibold text-purple-400">Administrator Login</span>
            </div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/60 bg-white/5"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-white/15 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/60 bg-white/5"
            />
            {adminError && <p className="text-red-400 text-sm text-center">{adminError}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--accent)] hover:brightness-110 text-black font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in as Admin"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdmin(false); setAdminError(""); }}
              className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="text-gray-700 text-xs text-center">
          By playing you agree to our{" "}
          <Link href="/terms" className="hover:text-gray-500 transition-colors underline underline-offset-2">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="hover:text-gray-500 transition-colors underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
