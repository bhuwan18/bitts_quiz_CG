"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";
import { useUnreadCount } from "@/components/layout/NotificationsProvider";
import { useHasNewFeed } from "@/components/layout/FeedProvider";
import {
  LayoutDashboard,
  Compass,
  Trophy,
  ShoppingBag,
  Layers,
  Gamepad2,
  MessageSquare,
  Store,
  Bell,
  Rss,
  PenLine,
  Users,
  CreditCard,
  ClipboardList,
  MessageCircle,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Medal,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

const NAV_ITEMS: { href: string; icon: LucideIcon; label: string; color: string }[] = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard",   color: "text-blue-400"   },
  { href: "/discover",    icon: Compass,         label: "Discover",    color: "text-cyan-400"   },
  { href: "/leaderboard", icon: Trophy,           label: "Leaderboard", color: "text-amber-400"  },
  { href: "/marketplace", icon: ShoppingBag,      label: "Marketplace", color: "text-green-400"  },
  { href: "/quizlets",    icon: Layers,           label: "Quizlets",    color: "text-violet-400" },
  { href: "/trading",     icon: ArrowLeftRight,   label: "Trading",     color: "text-rose-400"   },
  { href: "/milestones",  icon: Medal,            label: "Milestones",  color: "text-yellow-400" },
  { href: "/feed",        icon: Rss,              label: "Feed",        color: "text-teal-400"   },
  { href: "/game",        icon: Gamepad2,         label: "Game Modes",  color: "text-orange-400" },
  { href: "/feedback",    icon: MessageSquare,    label: "Feedback",    color: "text-pink-400"   },
  { href: "/shop",        icon: Store,            label: "Shop",        color: "text-emerald-400"},
];

const ADMIN_NAV_ITEMS: { href: string; icon: LucideIcon; label: string; color: string }[] = [
  { href: "/quiz-maker",       icon: PenLine,       label: "Quiz Maker",   color: "text-indigo-400" },
  { href: "/admin/users",      icon: Users,         label: "User Manager", color: "text-sky-400"    },
  { href: "/admin/payments",   icon: CreditCard,    label: "Payments",     color: "text-lime-400"   },
  { href: "/admin/quizzes",    icon: ClipboardList, label: "Edit Quizzes", color: "text-amber-400"  },
  { href: "/admin/feedback",             icon: MessageCircle, label: "Feedback",            color: "text-rose-400"   },
  { href: "/admin/quizlet-submissions", icon: Sparkles,      label: "Quizlet Submissions", color: "text-amber-400"  },
  { href: "/admin/settings",            icon: Settings,      label: "Settings",            color: "text-slate-400"  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as { isAdmin?: boolean; isPro?: boolean; isMax?: boolean; isBlacksmith?: boolean } | undefined;
  const isAdmin = !!user?.isAdmin;
  const isPro = !!user?.isPro;
  const isMax = !!user?.isMax;
  const isBlacksmith = !!user?.isBlacksmith;

  const unreadCount = useUnreadCount();
  const hasNewFeed = useHasNewFeed();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bq_sidebar_collapsed") === "true";
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("bq_sidebar_collapsed", String(next));
  };

  const navItemClass = (active: boolean, adminStyle = false) =>
    cn(
      "flex items-center rounded-lg transition-all duration-200 group/item",
      collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
      active
        ? adminStyle
          ? "bg-amber-500/15 text-amber-100 border border-amber-500/35"
          : "bg-amber-500/15 text-amber-100 border border-amber-500/30 shadow-sm"
        : adminStyle
          ? "text-slate-400/80 hover:bg-white/5 hover:text-slate-200"
          : "text-gray-400 hover:bg-white/5 hover:text-white"
    );

  return (
    <aside
      className="min-h-screen flex flex-col shrink-0 border-r overflow-hidden transition-[width] duration-300 ease-in-out"
      style={{
        width: collapsed ? "68px" : "240px",
        background: "linear-gradient(180deg, var(--sidebar-from) 0%, var(--sidebar-mid) 50%, var(--sidebar-to) 100%)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo + toggle */}
      <div className={cn(
        "border-b border-white/8 flex items-center",
        collapsed ? "justify-center p-3 flex-col gap-2" : "px-4 py-4 justify-between"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0" title={collapsed ? "BittsQuiz" : undefined}>
          <Image
            src="/icon.svg"
            alt="BittsQuiz"
            width={32}
            height={32}
            className="shrink-0 group-hover:scale-110 transition-transform rounded-md"
          />
          {!collapsed && (
            <span className="text-lg font-bold text-white whitespace-nowrap tracking-tight">
              Bitts<span className="text-[var(--accent)]">Quiz</span>
            </span>
          )}
        </Link>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0",
            collapsed && "mt-0"
          )}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 py-3 space-y-0.5 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        {NAV_ITEMS.map(({ href, icon: Icon, label, color }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          const isFeed = href === "/feed";
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined} className={navItemClass(active)}>
              <span className="relative shrink-0">
                <Icon size={collapsed ? 20 : 17} className={cn("shrink-0", active ? "opacity-100" : color)} />
                {isFeed && hasNewFeed && (
                  <>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping opacity-75" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-400" />
                  </>
                )}
              </span>
              {!collapsed && <span className="text-sm font-medium flex-1">{label}</span>}
              {!collapsed && isFeed && hasNewFeed && (
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
              )}
            </Link>
          );
        })}

        {/* Notifications */}
        <Link
          href="/notifications"
          title={collapsed ? "Notifications" : undefined}
          className={navItemClass(pathname === "/notifications")}
        >
          <span className="relative shrink-0">
            <Bell size={collapsed ? 20 : 17} className={cn(pathname === "/notifications" ? "opacity-100" : "text-red-400")} />
            {unreadCount > 0 && (
              <span className={cn(
                "absolute bg-red-500 text-white font-bold rounded-full leading-none flex items-center justify-center",
                collapsed
                  ? "-top-1.5 -right-1.5 w-4 h-4 text-[9px]"
                  : "-top-1 -right-1 w-3.5 h-3.5 text-[8px]"
              )}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </>
          )}
        </Link>

        {/* Admin-only section */}
        {isAdmin && (
          <>
            <div className={cn("pt-3 pb-1", collapsed ? "px-0" : "px-1")}>
              <div className="border-t border-white/8 mb-2" />
              {!collapsed && (
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Admin Panel</p>
              )}
            </div>
            {ADMIN_NAV_ITEMS.map(({ href, icon: Icon, label, color }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href} title={collapsed ? label : undefined} className={navItemClass(active, true)}>
                  <Icon size={collapsed ? 20 : 17} className={cn("shrink-0", active ? "opacity-100" : color)} />
                  {!collapsed && <span className="text-sm font-medium">{label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User section */}
      {session?.user && (
        <div className={cn("border-t border-white/8", collapsed ? "px-2 py-3" : "px-4 py-4")}>
          {!collapsed && isAdmin && (
            <div className="mb-2.5 text-center">
              <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-0.5 rounded-full font-semibold">
                ADMIN
              </span>
            </div>
          )}
          {!collapsed && !isAdmin && (isPro || isMax) && (
            <div className="mb-2.5 text-center">
              <span className="text-xs bg-gradient-to-r from-yellow-500 to-orange-400 text-black px-3 py-0.5 rounded-full font-bold">
                {isMax ? "MAX" : "PRO"}
              </span>
            </div>
          )}
          {!collapsed && !isAdmin && isBlacksmith && !isPro && !isMax && (
            <div className="mb-2.5 text-center">
              <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-black px-3 py-0.5 rounded-full font-bold">
                🔨 SMITH
              </span>
            </div>
          )}

          {collapsed ? (
            /* Collapsed: avatar + sign-out icon stacked */
            <div className="flex flex-col items-center gap-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt="Avatar"
                  width={32}
                  height={32}
                  title={session.user.name ?? ""}
                  className={cn(
                    "rounded-full ring-2 shrink-0 cursor-pointer",
                    isPro || isMax ? "ring-yellow-400 shadow-md shadow-yellow-400/50" : isBlacksmith ? "ring-amber-500 shadow-md shadow-amber-500/50" : "ring-white/20"
                  )}
                />
              ) : (
                <div
                  title={session.user.name ?? ""}
                  className={cn(
                    "w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-bold text-white ring-2 shrink-0",
                    isPro || isMax ? "ring-yellow-400 shadow-md shadow-yellow-400/50" : isBlacksmith ? "ring-amber-500 shadow-md shadow-amber-500/50" : "ring-white/20"
                  )}
                >
                  {session.user.name?.[0] ?? "?"}
                </div>
              )}
            </div>
          ) : (
            /* Expanded: full user row */
            <>
              <div className="flex items-center gap-3 mb-3">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt="Avatar"
                    width={34}
                    height={34}
                    className={cn(
                      "rounded-full ring-2 shrink-0",
                      isPro || isMax ? "ring-yellow-400 shadow-md shadow-yellow-400/50" : isBlacksmith ? "ring-amber-500 shadow-md shadow-amber-500/50" : "ring-white/20"
                    )}
                  />
                ) : (
                  <div className={cn(
                    "w-[34px] h-[34px] rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-bold text-white ring-2 shrink-0",
                    isPro || isMax ? "ring-yellow-400 shadow-md shadow-yellow-400/50" : isBlacksmith ? "ring-amber-500 shadow-md shadow-amber-500/50" : "ring-white/20"
                  )}>
                    {session.user.name?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
