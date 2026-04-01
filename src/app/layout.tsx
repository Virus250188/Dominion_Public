import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { BackgroundLayer } from "@/components/backgrounds/BackgroundLayer";
import { EditModeProvider } from "@/contexts/EditModeContext";

const geistSans = Geist({
  variable: "--font-sans",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      data-theme="glass-dark"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-animated-gradient">
        <ThemeProvider defaultTheme="glass-dark">
          <EditModeProvider>
            <BackgroundLayer />
            {children}
          </EditModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
