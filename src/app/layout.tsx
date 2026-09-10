import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Roboto_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants/app";
import { VisualModeProvider } from "@/components/layout/visual-mode-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-note",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: {
    icon: "/evolve.svg",
    shortcut: "/evolve.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-visual-mode="minimal" className={`${inter.variable} ${caveat.variable} ${robotoMono.variable}`}>
      <body>
        <VisualModeProvider />
        {children}
      </body>
    </html>
  );
}
