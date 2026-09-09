"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LibraryBig,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/question-bank", label: "Question Bank", icon: LibraryBig },
  { href: "/exams", label: "Exams", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

const COLLAPSED_KEY = "quizforge.sidebar.collapsed";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar navigasi utama — collapsible full-label ↔ icon-only (DESIGN.md §2).
 * Status collapse dipersist ke localStorage.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Baca preferensi setelah mount untuk menghindari hydration mismatch.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <TooltipProvider delay={200}>
      <aside
        aria-label="Navigasi utama"
        className={cn(
          "sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-16 items-center gap-2.5 border-b border-border",
            collapsed ? "justify-center px-2" : "px-5",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden />
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight">
              QuizForge
            </span>
          )}
        </div>

        {/* Navigasi */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {/* Saat collapsed, label tetap tersedia untuk screen reader */}
                <span className={cn(collapsed && "sr-only")}>{item.label}</span>
              </Link>
            );

            if (!collapsed) return link;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={<span />}>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <Separator />

        {/* Toggle collapse */}
        <div className={cn("p-3", collapsed && "flex justify-center")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            aria-expanded={!collapsed}
            className="text-muted-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronsRight aria-hidden />
            ) : (
              <ChevronsLeft aria-hidden />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
