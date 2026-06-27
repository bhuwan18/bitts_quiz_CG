import { auth } from "@/lib/auth";
import Link from "next/link";
import { Nunito } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import OnlinePing from "@/components/layout/OnlinePing";
import { AudioProvider } from "@/lib/audio-context";
import AudioPlayer from "@/components/AudioPlayer";
import PushSubscriptionManager from "@/components/layout/PushSubscriptionManager";
import { NotificationsProvider } from "@/components/layout/NotificationsProvider";
import { FeedProvider } from "@/components/layout/FeedProvider";
import SplashScreen from "@/components/SplashScreen";
import GuestBanner from "@/components/GuestBanner";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Guests get a stripped layout — no sidebar, no auth-dependent providers
  if (!session) {
    return (
      <AudioProvider>
        <div className={`flex min-h-screen flex-col ${nunito.variable}`} style={{ background: "var(--main-bg)" }}>
          <GuestBanner />
          <main className="flex-1">{children}</main>
        </div>
      </AudioProvider>
    );
  }

  return (
    <AudioProvider>
      <NotificationsProvider>
      <FeedProvider>
      <div className={`flex min-h-screen ${nunito.variable}`}>
        <div className="hidden md:flex sticky top-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex-1 min-w-0 flex flex-col min-h-screen" style={{ background: "var(--main-bg)" }}>
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
          <footer className="hidden md:block border-t border-white/5 py-3 px-6 text-center text-xs text-gray-600">
            Creator: <span className="text-purple-400/70 font-medium">Bhavik Lodha, G5MB</span>
            <span className="mx-2 opacity-30">·</span>
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <span className="mx-2 opacity-30">·</span>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
          </footer>
        </div>
      </div>
      <MobileNav />
      <OnlinePing />
      <AudioPlayer />
      <PushSubscriptionManager />
      <SplashScreen />
      </FeedProvider>
      </NotificationsProvider>
    </AudioProvider>
  );
}
