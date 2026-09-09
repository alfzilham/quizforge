import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageTransition } from "@/components/layout/page-transition";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Skip link — aksesibilitas keyboard (WCAG 2.1) */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Lewati ke konten utama
      </a>

      <AppSidebar />

      <main
        id="konten-utama"
        tabIndex={-1}
        className="min-w-0 flex-1 focus:outline-none"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
