import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { CATEGORIES } from "@/lib/utils";
import { DAILY_LIMIT_REGULAR, DAILY_LIMIT_PRO, DAILY_LIMIT_MAX } from "@/lib/game-config";
import IntroOverlay from "@/components/IntroOverlay";
import { MILESTONES, TIER_COLORS, getMilestoneByThreshold } from "@/lib/milestones-data";
import { STREAK_MILESTONES } from "@/lib/game-config";
import CategoryGrid from "@/components/dashboard/CategoryGrid";
import { Lock } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/discover");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      coins: true,
      totalCorrect: true,
      totalAnswered: true,
      name: true,
      isPro: true,
      proExpiresAt: true,
      isMax: true,
      maxExpiresAt: true,
      dailyCoinsEarned: true,
      dailyCoinsReset: true,
      totalCoinsEarned: true,
      currentStreak: true,
      longestStreak: true,
      streakFreezes: true,
    },
  });

  const [totalQuizlets, ownedQuizlets, latestMilestone, recentAttempts, categoryPlayRows, unplayedNewQuizzes] = await Promise.all([
    prisma.quizlet.count(),
    prisma.userQuizlet.count({ where: { userId: session.user.id } }),
    prisma.userMilestone.findFirst({
      where: { userId: session.user.id, milestoneType: "coins" },
      orderBy: { threshold: "desc" },
      select: { threshold: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId: session.user.id },
      include: { quiz: { select: { title: true, category: true } } },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    prisma.$queryRaw<{ category: string; attempts: number }[]>`
      SELECT q.category, COALESCE(COUNT(qa.id), 0)::int AS attempts
      FROM "Quiz" q
      LEFT JOIN "QuizAttempt" qa ON qa."quizId" = q.id
      GROUP BY q.category
    `,
    // Only new quizzes the user hasn't played yet — avoids fetching 2000 attempt rows
    prisma.quiz.findMany({
      where: {
        isNew: true,
        attempts: { none: { userId: session.user.id } },
      },
      select: { id: true, category: true },
    }),
  ]);

  const categoryPlayCounts: Record<string, number> = {};
  for (const row of categoryPlayRows) {
    categoryPlayCounts[row.category] = row.attempts;
  }

  const accuracy =
    user && user.totalAnswered > 0
      ? Math.round((user.totalCorrect / user.totalAnswered) * 100)
      : 0;

  const hasAll = ownedQuizlets >= totalQuizlets && totalQuizlets > 0;

  const isMaxActive = user?.isMax && (!user.maxExpiresAt || user.maxExpiresAt > new Date());
  const isProActive = !isMaxActive && user?.isPro && (!user.proExpiresAt || user.proExpiresAt > new Date());
  const dailyLimit = isMaxActive ? DAILY_LIMIT_MAX : isProActive ? DAILY_LIMIT_PRO : DAILY_LIMIT_REGULAR;
  const now = new Date();
  const resetDate = user?.dailyCoinsReset ? new Date(user.dailyCoinsReset) : new Date(0);
  const isNewDay =
    now.getUTCFullYear() !== resetDate.getUTCFullYear() ||
    now.getUTCMonth() !== resetDate.getUTCMonth() ||
    now.getUTCDate() !== resetDate.getUTCDate();
  const dailyEarned = isNewDay ? 0 : (user?.dailyCoinsEarned ?? 0);

  const categoriesWithNew = new Set(unplayedNewQuizzes.map((q) => q.category));

  const firstName = session.user.name?.split(" ")[0] ?? "Player";


  return (
    <div className="p-4 pb-24 md:p-8 md:pb-0 max-w-5xl mx-auto">
      <IntroOverlay />

      {/* Completion Certificate Banner */}
      {hasAll && (
        <div className="mb-6 p-5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-yellow-400 font-bold text-lg">🏆 You&apos;ve collected every Quizlet!</p>
            <p className="text-gray-300 text-sm mt-0.5">You have earned the BittsQuiz Master Certificate.</p>
          </div>
          <Link
            href="/certificate"
            className="shrink-0 px-5 py-2.5 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors text-sm"
          >
            View →
          </Link>
        </div>
      )}

      {/* ── Hero: Play-first CTA ── */}
      <div className="relative overflow-hidden rounded-3xl mb-8 border border-white/10"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent) 0%, color-mix(in srgb, var(--accent2) 15%, transparent) 100%)" }}>
        <div className="relative z-10 p-7 md:p-10">
          <p className="text-sm text-gray-400 font-medium mb-1">👋 Welcome back</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{firstName}!</h1>
          <p className="text-gray-300 mb-7 max-w-md text-sm md:text-base">
            You have{" "}
            <span className="text-yellow-400 font-bold">{user?.coins?.toLocaleString() ?? 0} coins</span>{" "}
            and {ownedQuizlets}/{totalQuizlets} Quizlets. Keep playing to collect them all!
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[var(--accent)] hover:brightness-110 text-black font-bold rounded-2xl transition-all hover:scale-105 shadow-lg text-base"
            >
              🚀 Play Now
            </Link>
            <Link
              href="/game"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/18 transition-all border border-white/20 text-base"
            >
              🎮 Game Modes
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pick a Category ── */}
      <CategoryGrid categoriesWithNew={[...categoriesWithNew]} totalCoinsEarned={user?.totalCoinsEarned ?? 0} categoryPlayCounts={categoryPlayCounts} />

      {/* ── Stats ── */}
      <div className="flex gap-4 mb-6">
        {/* Primary: coin balance — the number that drives play decisions */}
        <Link
          href="/shop"
          className="group flex flex-col justify-between p-5 rounded-2xl border transition-colors w-36 md:w-44 shrink-0"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <span className="text-3xl">🪙</span>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-white tabular-nums leading-none mb-0.5">
              {user?.coins?.toLocaleString() ?? "0"}
            </div>
            <div className="text-xs text-gray-400">Coins</div>
          </div>
          <span className="text-xs text-yellow-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-2">
            Get more →
          </span>
        </Link>

        {/* Secondary stats: compact labeled rows */}
        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div className="flex items-center gap-3 py-3 border-b border-white/5">
            <span className="text-lg shrink-0">✅</span>
            <span className="text-sm text-gray-400 flex-1">Correct answers</span>
            <span className="text-white font-semibold tabular-nums">{user?.totalCorrect?.toLocaleString() ?? "0"}</span>
          </div>
          <div className="flex items-center gap-3 py-3 border-b border-white/5">
            <span className="text-lg shrink-0">🎯</span>
            <span className="text-sm text-gray-400 flex-1">Accuracy</span>
            <span className="text-white font-semibold">{accuracy}%</span>
          </div>
          <Link href="/quizlets" className="group/q flex items-center gap-3 py-3">
            <span className="text-lg shrink-0">🎴</span>
            <span className="text-sm text-gray-400 flex-1 group-hover/q:text-gray-300 transition-colors">Quizlets owned</span>
            <span className="text-white font-semibold">{ownedQuizlets}/{totalQuizlets} →</span>
          </Link>
        </div>
      </div>

      {/* ── Milestone + Streak (side-by-side) ── */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Milestone Progress */}
        {(() => {
          const totalCoinsEarned = user?.totalCoinsEarned ?? 0;
          const latestBadge = latestMilestone ? getMilestoneByThreshold(latestMilestone.threshold) : null;
          const nextMilestone = MILESTONES.find((m) => m.threshold > (latestMilestone?.threshold ?? 0));
          const progressPct = nextMilestone
            ? Math.min(100, Math.round((totalCoinsEarned / nextMilestone.threshold) * 100))
            : 100;
          return (
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {latestBadge ? (
                  <div
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl shrink-0 ${TIER_COLORS[latestBadge.tier].border} ${latestBadge.animationClass ?? ""}`}
                    style={{ background: `linear-gradient(135deg, ${latestBadge.colorFrom}, ${latestBadge.colorTo})` }}
                  >
                    {latestBadge.emoji}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl border-2 border-rose-500/40 bg-rose-500/10 flex items-center justify-center shrink-0">
                    <Lock size={20} className="text-rose-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm truncate">
                    {latestBadge ? latestBadge.name : "No milestones yet"}
                  </p>
                  <p className={`text-xs ${latestBadge ? TIER_COLORS[latestBadge.tier].text : "text-gray-500"}`}>
                    {latestBadge ? `${TIER_COLORS[latestBadge.tier].label} milestone` : "Play to earn your first!"}
                  </p>
                </div>
              </div>

              <div className="flex-1">
                {nextMilestone ? (
                  <>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Next: <span className="text-white">{nextMilestone.name}</span></span>
                      <span>{totalCoinsEarned.toLocaleString()} / {nextMilestone.threshold.toLocaleString()}</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={progressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Milestone progress"
                      className="h-2 rounded-full bg-white/10 overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-transform duration-500 ease-out"
                        style={{ transform: `scaleX(${progressPct / 100})`, transformOrigin: "left", willChange: "transform" }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-yellow-400 font-semibold text-sm">All {MILESTONES.length} coin milestones unlocked!</p>
                )}
              </div>

              <Link
                href="/milestones"
                className="mt-auto self-start px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
          );
        })()}

        {/* Streak */}
        {(() => {
          const streak = user?.currentStreak ?? 0;
          const longest = user?.longestStreak ?? 0;
          const freezes = user?.streakFreezes ?? 0;
          const nextStreakMilestone = STREAK_MILESTONES.find((t) => t > streak) ?? null;
          const prevMilestone = [...STREAK_MILESTONES].reverse().find((t) => t <= streak) ?? 0;
          const progressPct = nextStreakMilestone
            ? Math.min(100, Math.round(((streak - prevMilestone) / (nextStreakMilestone - prevMilestone)) * 100))
            : 100;
          return (
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border-2 border-orange-500/50 bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center text-2xl shrink-0">
                  🔥
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-xl leading-none">{streak} <span className="text-sm font-normal text-gray-400">day streak</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {longest > streak ? <>Best: {longest}</> : null}
                    {longest > streak && freezes > 0 ? " · " : null}
                    {freezes > 0 ? <>🧊 {freezes} freeze{freezes !== 1 ? "s" : ""}</> : null}
                  </p>
                </div>
              </div>

              <div className="flex-1">
                {streak === 0 ? (
                  <p className="text-sm text-gray-400">Play a quiz today to start your streak!</p>
                ) : nextStreakMilestone ? (
                  <>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Next: <span className="text-white">{nextStreakMilestone} days</span></span>
                      <span>{streak} / {nextStreakMilestone}</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={progressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Streak progress"
                      className="h-2 rounded-full bg-white/10 overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-400 transition-transform duration-500 ease-out"
                        style={{ transform: `scaleX(${progressPct / 100})`, transformOrigin: "left", willChange: "transform" }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-orange-400 font-semibold text-sm">All streak milestones reached!</p>
                )}
              </div>

              <Link
                href="/shop"
                className="mt-auto self-start px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Buy freezes &rarr;
              </Link>
            </div>
          );
        })()}
      </div>

      {/* ── Daily Coins + Collection Progress ── */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {/* Daily Coin Limit */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white flex items-center gap-1.5">
              🪙 Daily Coins
              {isMaxActive && <span className="text-purple-400 text-xs">(Max)</span>}
              {!isMaxActive && isProActive && <span className="text-yellow-400 text-xs">(Pro)</span>}
            </span>
            <span className="text-sm text-gray-400">{dailyEarned} / {dailyLimit}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round((dailyEarned / dailyLimit) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Daily coins earned"
            className="w-full bg-white/10 rounded-full h-2.5 mb-2 overflow-hidden"
          >
            <div
              className="h-2.5 rounded-full transition-transform duration-500 ease-out bg-gradient-to-r from-amber-500 to-yellow-400"
              style={{ transform: `scaleX(${Math.min(100, Math.round((dailyEarned / dailyLimit) * 100)) / 100})`, transformOrigin: "left", willChange: "transform" }}
            />
          </div>
          {dailyEarned >= dailyLimit ? (
            <p className="text-xs text-gray-400">
              You&apos;ve maxed out today — come back tomorrow!{" "}
              {!isProActive && !isMaxActive && <Link href="/shop" className="text-amber-400 hover:text-amber-300">Upgrade for a higher limit →</Link>}
            </p>
          ) : (
            <p className="text-xs text-gray-500">{dailyLimit - dailyEarned} coins left today</p>
          )}
        </div>

        {/* Collection Progress */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">🎴 Collection</span>
            <span className="text-sm text-gray-400">{ownedQuizlets} / {totalQuizlets}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round((ownedQuizlets / Math.max(totalQuizlets, 1)) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Collection progress"
            className="w-full bg-white/10 rounded-full h-2.5 mb-2 overflow-hidden"
          >
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2.5 rounded-full transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${Math.round((ownedQuizlets / Math.max(totalQuizlets, 1)) * 100) / 100})`, transformOrigin: "left", willChange: "transform" }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{Math.round((ownedQuizlets / Math.max(totalQuizlets, 1)) * 100)}% complete</span>
            <Link href="/marketplace" className="text-amber-400 hover:text-amber-300">Open packs →</Link>
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      {recentAttempts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link href="/discover" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">Play more →</Link>
          </div>
          <div className="space-y-3">
            {recentAttempts.map((attempt) => {
              const pct = Math.round((attempt.score / attempt.total) * 100);
              const cat = CATEGORIES.find((c) => c.slug === attempt.quiz.category);
              const AttemptIcon = cat?.icon;
              return (
                <div key={attempt.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    {AttemptIcon ? <AttemptIcon size={20} className={cat!.color} /> : <span className="text-xl">📝</span>}
                    <div>
                      <p className="text-sm text-white font-medium">{attempt.quiz.title}</p>
                      <p className="text-xs text-gray-500">{new Date(attempt.completedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {attempt.score}/{attempt.total}
                    </p>
                    <p className="text-xs text-yellow-500">+{attempt.coinsEarned} 🪙</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
