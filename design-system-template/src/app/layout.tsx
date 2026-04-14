import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ACTIVE_THEME } from "@/config/theme";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fontClassMap = {
  "samsung-one-ui": `${inter.variable}`,
  "one-group": `${inter.variable}`,
} as const;

export const metadata: Metadata = {
  title: "One Group UI",
  description: "One Group Developers — Unified UI Library (Samsung One UI + Brand Overlay)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={ACTIVE_THEME}
      className={`${fontClassMap[ACTIVE_THEME]} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {ACTIVE_THEME === "one-group" && (
          <style>{`
            :root {
              --font-anthropic-serif: 'Anthropic Serif', Georgia, serif;
              --font-anthropic-sans: 'Anthropic Sans', Inter, system-ui, sans-serif;
              --font-anthropic-mono: 'Anthropic Mono', 'JetBrains Mono', monospace;
            }
          `}</style>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
