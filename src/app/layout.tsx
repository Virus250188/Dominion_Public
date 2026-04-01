import type { Metadata } from "next";
import { Geist, Wallpoet } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { BackgroundLayer } from "@/components/backgrounds/BackgroundLayer";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { auth } from "@/lib/auth";
import { getUserSettings } from "@/lib/queries/settings";
import type { Theme } from "@/types/theme";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const wallpoet = Wallpoet({
  variable: "--font-brand",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dominion Dashboard",
  description: "Dominion - A self-hosted application dashboard. Organize and access your services and apps from one place.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Dominion Dashboard",
    description: "A self-hosted application dashboard with plugin system, live stats, and beautiful themes.",
    images: ["/dominion-banner.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch persisted appearance settings from DB for authenticated users
  let dbTheme: Theme = "glass-dark";
  let dbBackground: string | null = null;
  let dbBackgroundType: string = "gradient";
  let dbSettingsLoaded = false;

  try {
    const session = await auth();
    if (session?.user?.id) {
      const userId = parseInt(session.user.id, 10);
      if (!isNaN(userId)) {
        const settings = await getUserSettings(userId);
        if (settings) {
          dbTheme = (settings.theme as Theme) || "glass-dark";
          dbBackground = settings.background ?? null;
          dbBackgroundType = settings.backgroundType || "gradient";
          dbSettingsLoaded = true;
        }
      }
    }
  } catch {
    // Not authenticated or DB error - use defaults (login/setup pages)
  }

  return (
    <html
      lang="de"
      data-theme={dbTheme}
      className={`${geistSans.variable} ${wallpoet.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-animated-gradient">
        <ThemeProvider
          defaultTheme={dbTheme}
          defaultBackground={dbBackground}
          defaultBackgroundType={dbBackgroundType}
          dbSettingsLoaded={dbSettingsLoaded}
        >
          <EditModeProvider>
            <BackgroundLayer />
            {children}
          </EditModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
