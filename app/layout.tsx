import type { Metadata } from "next";
import { Nunito, Rubik } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import ThemeProvider from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import CrazyGamesProvider from "@/components/CrazyGamesProvider";
import CrazyGamesAuthProvider from "@/components/CrazyGamesAuthProvider";

const jakarta = Nunito({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700"] });
const grotesk = Rubik({ subsets: ["latin"], variable: "--font-grotesk", weight: ["700", "800"] });

export const metadata: Metadata = {
  title: "BittsQuiz",
  description: "Answer quizzes, earn coins, and collect rare Quizlet characters. The ultimate quiz & collectible experience!",
  verification: {
    google: "YkJoNwZuKpoBjCyy-Xa5DStNjD3_BmH5TdXEvo3auLI",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${grotesk.variable} font-sans antialiased min-h-screen`}>
        {/* Suppress CrazyGames SDK "sdkDisabled" errors that fire when the app is
            accessed outside crazygames.com — without this, the uncaught rejection
            triggers Next.js's error boundary and crashes the page. */}
        <script dangerouslySetInnerHTML={{ __html: `
          var CG_SDK_ERRORS = ['sdkDisabled', 'sdkNotInitialized'];
          window.addEventListener('unhandledrejection', function(e) {
            if (e.reason && CG_SDK_ERRORS.indexOf(e.reason.code) !== -1) e.preventDefault();
          });
          window.addEventListener('error', function(e) {
            if (e.error && CG_SDK_ERRORS.indexOf(e.error.code) !== -1) e.preventDefault();
          });
        ` }} />
        <Script src="https://sdk.crazygames.com/crazygames-sdk-v3.js" strategy="afterInteractive" />
        <ThemeProvider>
          <SessionProvider>
            <CrazyGamesProvider>
              <CrazyGamesAuthProvider>{children}</CrazyGamesAuthProvider>
            </CrazyGamesProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
