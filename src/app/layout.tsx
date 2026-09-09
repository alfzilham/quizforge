import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "QuizForge",
    template: "%s — QuizForge",
  },
  description:
    "Platform open source, self-hosted, untuk generate soal ujian dari dokumen menggunakan AI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning className={GeistSans.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {/* Tema mengikuti prefers-color-scheme OS — tanpa toggle manual (DESIGN.md §1) */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Hormati preferensi reduced-motion pengguna (WCAG 2.1) */}
          <MotionConfig reducedMotion="user">
            <SmoothScroll>{children}</SmoothScroll>
          </MotionConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}
