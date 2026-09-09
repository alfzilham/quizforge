Semua keputusan terkunci. Berikut output Tahap 1 lengkap — jalankan berurutan, semua file di bawah siap copy-paste.

---

## Langkah 1 — Inisialisasi project

```bash
npx create-next-app@15 quizforge \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm
# Jika ditanya "Use Turbopack for next dev?" → pilih No
# Prompt lain yang muncul → jawab default/No

cd quizforge

# Bersihkan boilerplate
rm src/app/page.tsx
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

## Langkah 2 — Install dependency

```bash
npm i @prisma/client zod lenis next-themes geist motion lucide-react tw-animate-css
npm i -D prisma
```

## Langkah 3 — shadcn/ui

```bash
npx shadcn@latest init
# style → new-york | base color → neutral | CSS variables → yes | icon library → lucide

npx shadcn@latest add button card separator tooltip
```

> `shadcn init` akan menulis `globals.css` default — kita timpa di Langkah 5 dengan versi bertema indigo + scrollbar kustom.

## Langkah 4 — Struktur folder sesuai ARCHITECTURE.md

```bash
mkdir -p src/lib/parsing src/lib/ai src/lib/validation src/lib/grading
mkdir -p storage/uploads tests/unit tests/e2e docs
mkdir -p src/app/api/documents src/app/api/questions src/app/api/generate \
         src/app/api/exams src/app/api/grading src/app/api/backup

touch src/lib/parsing/.gitkeep src/lib/ai/.gitkeep \
      src/lib/validation/.gitkeep src/lib/grading/.gitkeep \
      storage/uploads/.gitkeep tests/unit/.gitkeep tests/e2e/.gitkeep \
      src/app/api/documents/.gitkeep src/app/api/questions/.gitkeep \
      src/app/api/generate/.gitkeep src/app/api/exams/.gitkeep \
      src/app/api/grading/.gitkeep src/app/api/backup/.gitkeep

# Pindahkan 4 dokumen spec ke docs/ (posisi sesuai ARCHITECTURE.md)
mv CONTEXT.md ARCHITECTURE.md SPEC.md DESIGN.md docs/
```

## Langkah 5 — Tulis/overwrite file-file berikut

### `package.json` — ganti hanya blok `scripts`

Bind `127.0.0.1` di-hardcode di script (cek keamanan DESIGN.md §7: tidak pernah `0.0.0.0`, dev & production):

```json
{
  "scripts": {
    "dev": "next dev -H 127.0.0.1 -p 3000",
    "build": "next build",
    "start": "next start -H 127.0.0.1 -p 3000",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

### `prisma/schema.prisma`

Jalankan `npx prisma init --datasource-provider postgresql` dulu, lalu timpa isinya dengan ini. Setiap keputusan yang kamu konfirmasi dicatat sebagai komentar supaya opencode/Codex tidak "merapihkan" balik ke bentuk literal spec:

```prisma
// QuizForge — Prisma schema
// Sumber: SPEC.md §10, dengan keputusan desain yang sudah dikonfirmasi owner:
// 1. Question ↔ Document      → join table eksplisit (DocumentQuestion)
// 2. Tag                      → tabel terpisah, melekat di QUESTION (bukan QuestionVersion).
//                               Rollback versi tidak boleh menghilangkan tag.
// 3. ExamSession ↔ Question   → join table ExamSessionQuestion dengan `position`
// 4. Cascade: Collection→Restrict; Document dihapus→Question tetap (link putus);
//    Question→Restrict jika dipakai ExamSession manapun (termasuk completed);
//    ExamSession dihapus→ExamAnswer Cascade.
// 5. sourceReference          → sourceDocumentId (FK nullable) + sourceReference (teks)
// 6. currentVersionId eksplisit (mendukung rollback), bukan versi tertinggi otomatis.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────── Enums ───────────────────────────

enum QuestionType {
  MULTIPLE_CHOICE @map("multiple_choice")
  SHORT_ANSWER    @map("short_answer")
  ESSAY           @map("essay")
}

enum Difficulty {
  EASY   @map("easy")
  MEDIUM @map("medium")
  HARD   @map("hard")
}

enum DocumentStatus {
  PROCESSING @map("processing")
  READY      @map("ready")
  FAILED     @map("failed")
}

enum FileType {
  PDF  @map("pdf")
  DOCX @map("docx")
  PPTX @map("pptx")
  XLSX @map("xlsx")
}

enum ExamStatus {
  IN_PROGRESS @map("in_progress")
  COMPLETED   @map("completed")
}

enum VersionAuthor {
  MANUAL_EDIT   @map("manual_edit")
  AI_GENERATE   @map("ai_generate")
  AI_REGENERATE @map("ai_regenerate")
}

// ─────────────────────────── Models ───────────────────────────

/// Folder pengelompokan dokumen. Soal mewarisi collection dari dokumen asalnya.
model Collection {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())

  documents Document[]
  questions Question[]
}

/// File yang diupload user + hasil parsing.
model Document {
  id               String         @id @default(cuid())
  collectionId     String
  originalFilename String
  /// Nama random/hashed di storage/uploads — nama asli user tidak pernah jadi path (DESIGN.md §7).
  storedFilename   String         @unique
  fileType         FileType
  status           DocumentStatus @default(PROCESSING)
  errorMessage     String?
  /// Teks + metadata referensi (halaman/section/sheet). Terisi setelah parsing sukses.
  parsedContent    Json?
  createdAt        DateTime       @default(now())

  collection     Collection         @relation(fields: [collectionId], references: [id], onDelete: Restrict)
  questions      DocumentQuestion[]
  /// Versi soal yang mereferensikan dokumen ini sebagai sumber.
  /// SetNull saat dokumen dihapus: histori versi tetap ada, link sumber putus.
  versionSources QuestionVersion[]  @relation("VersionSourceDocument")

  @@index([collectionId])
  @@index([status])
}

/// Join table Question ↔ Document — soal bisa bersumber dari banyak dokumen.
model DocumentQuestion {
  documentId String
  questionId String

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@id([documentId, questionId])
}

/// Satu soal di Question Bank. Konten hidup di QuestionVersion;
/// Question memegang identitas, versi aktif, dan metadata organisasi (tag, collection).
model Question {
  id           String       @id @default(cuid())
  collectionId String
  type         QuestionType
  /// Versi aktif saat ini (eksplisit — mendukung rollback ke versi lama).
  currentVersionId String?  @unique
  createdAt        DateTime @default(now())

  collection     Collection            @relation(fields: [collectionId], references: [id], onDelete: Restrict)
  currentVersion QuestionVersion?      @relation("QuestionCurrentVersion", fields: [currentVersionId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  versions       QuestionVersion[]     @relation("QuestionVersions")
  documents      DocumentQuestion[]
  tags           QuestionTag[]
  examSessions   ExamSessionQuestion[]
  answers        ExamAnswer[]

  @@index([collectionId])
  @@index([type])
}

/// Satu versi dari sebuah soal. Setiap edit manual / regenerate membuat versi baru;
/// versi lama tidak pernah dihapus (histori + rollback).
model QuestionVersion {
  id            String        @id @default(cuid())
  questionId    String
  versionNumber Int
  text          String        @db.Text
  /// Khusus MC: [{ text, isCorrect, explanation }]. Null untuk isian singkat/esai.
  options       Json?
  correctAnswer String        @db.Text
  explanation   String?       @db.Text
  difficulty    Difficulty
  /// Referensi sumber: dokumen + label lokasi (mis. "Hal. 12", "Slide 5", "Sheet1 baris 3").
  /// SetNull jika dokumen sumber dihapus.
  sourceDocumentId String?
  sourceReference  String?
  createdBy        VersionAuthor
  createdAt        DateTime      @default(now())

  question       Question  @relation("QuestionVersions", fields: [questionId], references: [id], onDelete: Cascade)
  sourceDocument Document? @relation("VersionSourceDocument", fields: [sourceDocumentId], references: [id], onDelete: SetNull)
  currentOf      Question? @relation("QuestionCurrentVersion")

  @@unique([questionId, versionNumber])
  @@index([questionId])
}

/// Tag bebas untuk organisasi bank soal (SPEC.md §5).
model Tag {
  id        String   @id @default(cuid())
  /// Dinormalisasi (trim + lowercase) di layer aplikasi sebelum upsert.
  name      String   @unique
  createdAt DateTime @default(now())

  questions QuestionTag[]
}

/// Join table Question ↔ Tag — melekat di Question, bukan versi.
model QuestionTag {
  questionId String
  tagId      String

  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  tag      Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([questionId, tagId])
}

/// Satu sesi pengerjaan ujian (SPEC.md §7).
model ExamSession {
  id           String     @id @default(cuid())
  timerEnabled Boolean    @default(false)
  /// Durasi total sesi dalam detik (jika timer aktif).
  timerDurationSeconds Int?
  /// Sisa waktu (detik) untuk pause/resume — timer di-pause saat sesi ditinggalkan.
  timerRemainingSeconds Int?
  status                ExamStatus @default(IN_PROGRESS)
  startedAt             DateTime   @default(now())
  completedAt           DateTime?

  questions ExamSessionQuestion[]
  answers   ExamAnswer[]

  @@index([status])
}

/// Join table ExamSession ↔ Question dengan urutan pengerjaan (navigasi linear).
model ExamSessionQuestion {
  examSessionId String
  questionId    String
  /// Urutan soal dalam sesi (1-based).
  position      Int

  examSession ExamSession @relation(fields: [examSessionId], references: [id], onDelete: Cascade)
  /// Restrict: soal yang pernah dipakai di sesi (termasuk completed) tidak bisa dihapus —
  /// ExamAnswer adalah bukti riwayat. Hapus dulu ExamSession-nya jika perlu.
  question    Question    @relation(fields: [questionId], references: [id], onDelete: Restrict)

  @@id([examSessionId, questionId])
  @@index([examSessionId, position])
}

/// Jawaban per soal dalam satu sesi (auto-save = upsert per examSessionId+questionId).
model ExamAnswer {
  id            String   @id @default(cuid())
  examSessionId String
  questionId    String
  userAnswer    String   @db.Text
  /// Hasil grading rule-based (MC / isian singkat).
  isCorrect Boolean?
  /// Hasil AI-grading (esai).
  aiScore    Float?
  aiFeedback String? @db.Text
  /// Terakhir kali jawaban disimpan (auto-save).
  answeredAt DateTime @default(now()) @updatedAt

  examSession ExamSession @relation(fields: [examSessionId], references: [id], onDelete: Cascade)
  question    Question    @relation(fields: [questionId], references: [id], onDelete: Restrict)

  @@unique([examSessionId, questionId])
  @@index([questionId])
}
```

### `.env.example`

```
# ── Database ─────────────────────────────────────────────
# PostgreSQL lokal (native, tanpa Docker — ARCHITECTURE.md)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quizforge?schema=public"

# ── AI Provider — SERVER-SIDE ONLY, tidak pernah dikirim ke client ──
OPENROUTER_API_KEY=
OPENROUTER_MODEL_GENERATE=      # model free-tier untuk generate soal
OPENROUTER_MODEL_GRADING=       # model free-tier untuk AI-grading esai
GEMINI_API_KEY=
GEMINI_MODEL_VISION=            # untuk pembacaan gambar/dokumen scan

# ── Server ───────────────────────────────────────────────
# Catatan: script npm meng-hardcode 127.0.0.1 (DESIGN.md §7 — tidak pernah 0.0.0.0)
HOST=127.0.0.1
PORT=3000

# ── Rate limiting (SPEC.md §9) ───────────────────────────
# Maks request per menit untuk endpoint generate soal & AI-grading
AI_GENERATION_RATE_LIMIT=5
```

### `.gitignore` (lengkap, ganti seluruhnya)

```
# dependencies
/node_modules
/.pnp
.pnp.*

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env — hanya .env.example yang boleh di-commit (DESIGN.md §7)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.*.local

# dokumen user di storage lokal — tidak pernah masuk git
/storage/uploads/*
!/storage/uploads/.gitkeep

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

### `src/app/globals.css` (timpa hasil shadcn init)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* ── Token tema QuizForge ─────────────────────────────────────────────
   Base: netral (shadcn). Aksen/primary: indigo (DESIGN.md §1).
   Tema mengikuti prefers-color-scheme OS via next-themes (tanpa toggle).
   Nilai dipilih untuk memenuhi kontras WCAG 2.1 AA. */

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  /* Aksen platform: indigo */
  --primary: oklch(0.511 0.262 276.966); /* indigo-600 */
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  /* Highlight/hover bernuansa aksen */
  --accent: oklch(0.962 0.018 272.314); /* indigo-50 */
  --accent-foreground: oklch(0.359 0.144 278.697); /* indigo-900 */
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.585 0.233 277.117); /* indigo-500 — focus indicator jelas */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.269 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.673 0.182 276.935); /* indigo-400 */
  --primary-foreground: oklch(0.145 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.257 0.09 281.288); /* indigo-950 */
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.673 0.182 276.935); /* indigo-400 */
}

@theme inline {
  --font-sans: var(--font-geist-sans);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* ── Scrollbar kustom (DESIGN.md §3) ─────────────────────────────────
   Tipis, rounded, mengikuti tema. WebKit + fallback Firefox. */
* {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--muted-foreground) 30%, transparent)
    transparent;
}

::-webkit-scrollbar {
  width: 0.5rem;
  height: 0.5rem;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: color-mix(
    in oklab,
    var(--muted-foreground) 30%,
    transparent
  );
}

::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(
    in oklab,
    var(--muted-foreground) 50%,
    transparent
  );
}
```

### `src/app/layout.tsx`

```tsx
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
```

### `src/components/theme-provider.tsx`

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### `src/components/smooth-scroll.tsx`

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scroll global via Lenis (DESIGN.md §4), dipasang sekali di root layout.
 * Untuk container scroll terpisah (mis. badan dialog/modal),
 * tambahkan atribut `data-lenis-prevent` pada container tersebut.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
```

### `src/components/layout/page-transition.tsx`

```tsx
"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";

/**
 * Transisi antar route: fade + slide kecil, 150–200ms (DESIGN.md §4).
 * Dinonaktifkan otomatis oleh MotionConfig reducedMotion="user".
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "ease-out" }}
    >
      {children}
    </motion.div>
  );
}
```

### `src/components/layout/app-sidebar.tsx`

```tsx
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
    <TooltipProvider delayDuration={200}>
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
                <TooltipTrigger asChild>{link}</TooltipTrigger>
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
```

### `src/components/layout/page-header.tsx`

```tsx
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Aksi halaman (tombol, dll.) — dipakai mulai Tahap 2. */
  children?: ReactNode;
};

/** Header standar per halaman konten (DESIGN.md §2). */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}
```

### `src/app/(dashboard)/layout.tsx`

```tsx
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageTransition } from "@/components/layout/page-transition";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Skip link — aksesibilitas keyboard (WCAG 2.1) */}
      <a
        href="#konten-utama"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
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
```

### `src/app/(dashboard)/page.tsx` — Dashboard

> **Catatan:** SPEC.md tidak mendefinisikan isi Dashboard (hanya ada di nav DESIGN.md), jadi ini placeholder yang jujur — isi dengan statistik riil nanti.

```tsx
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan aktivitas QuizForge kamu."
      />
      <Card>
        <CardHeader>
          <CardTitle>Selamat datang di QuizForge</CardTitle>
          <CardDescription>
            Mulai dengan mengupload dokumen di halaman Documents, lalu generate
            soal dari sana.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Placeholder — statistik ringkasan (jumlah dokumen, soal, sesi ujian)
            akan ditampilkan di sini.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
```

### 4 halaman placeholder lain

Pola sama untuk `src/app/(dashboard)/documents/page.tsx`, `question-bank/page.tsx`, `exams/page.tsx`, `settings/page.tsx`. Contoh Documents — yang lain menyesuaikan `title`/`description`/teks card:

```tsx
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dokumen" };

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="Dokumen"
        description="Upload dokumen sumber (PDF, DOCX, PPTX, XLSX) dan kelola dalam collection."
      />
      <Card>
        <CardHeader>
          <CardTitle>Belum ada dokumen</CardTitle>
          <CardDescription>
            Dokumen yang diupload akan muncul di sini beserta status
            parsing-nya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fitur upload &amp; parsing dokumen dibangun di Tahap 2.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
```

| Route            | `title`         | Deskripsi header                                                               |
| ---------------- | --------------- | ------------------------------------------------------------------------------ |
| `/question-bank` | `Question Bank` | "Semua soal yang pernah dibuat — cari, filter, edit, dan kelola versi."        |
| `/exams`         | `Ujian`         | "Buat sesi ujian dari soal di bank, kerjakan dengan timer, dan lihat riwayat." |
| `/settings`      | `Pengaturan`    | "Konfigurasi API key & model AI (via .env), rate limit, dan backup/restore."   |

### `src/lib/prisma.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Prisma client singleton — hindari banyak koneksi saat hot-reload dev. */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### `src/types/index.ts`

```ts
/**
 * Tipe bersama QuizForge.
 *
 * Saat ini `prisma/schema.prisma` adalah satu-satunya sumber kebenaran bentuk
 * data. File ini akan diisi tipe non-database (mis. bentuk respons AI, payload
 * API) saat fitur-fiturnya dibangun di tahap berikutnya.
 */
export {};
```

### `README.md` (ganti bawaan create-next-app)

````markdown
# QuizForge

Platform open source, self-hosted, berjalan di localhost untuk generate soal
ujian (pilihan ganda, isian singkat, esai) dari dokumen (PDF/DOCX/PPTX/XLSX)
menggunakan AI.

Dokumentasi lengkap: [`docs/`](./docs) — CONTEXT, ARCHITECTURE, SPEC, DESIGN.

## Prasyarat

- Node.js ≥ 18.18 (disarankan 20 LTS ke atas)
- PostgreSQL berjalan lokal (native, tanpa Docker)

## Menjalankan

```bash
cp .env.example .env      # lalu sesuaikan DATABASE_URL
npm install
npx prisma migrate dev    # buat schema database
npm run dev               # http://127.0.0.1:3000
```

> Server selalu bind ke `127.0.0.1` (dev & production) — tidak pernah
> terekspos ke jaringan.
````

## Langkah 6 — Database & verifikasi

```bash
cp .env.example .env          # sesuaikan user/password Postgres kamu
npx prisma migrate dev --name init
npm run dev
```

**Checklist verifikasi Tahap 1:**

- [ ] Terminal menampilkan `Ready on http://127.0.0.1:3000` (bukan `0.0.0.0`)
- [ ] `npx prisma studio` → terlihat 6 model inti + 2 join table (`DocumentQuestion`, `QuestionTag`, `ExamSessionQuestion` — total 9 tabel) beserta 6 enum
- [ ] Sidebar render 5 item, active state indigo di route aktif, tombol collapse bekerja + persist setelah reload, tooltip muncul saat icon-only
- [ ] Ganti OS ke dark mode → tema ikut otomatis tanpa toggle
- [ ] Tab navigasi: semua link/tooltip reachable via keyboard, focus ring indigo terlihat, skip-link muncul saat Tab pertama
- [ ] `git status` → `.env` dan `storage/uploads/*` tidak terlacak; hanya `.env.example` dan `.gitkeep` yang masuk

---

## Yang sudah tertanam sejak awal (untuk audit Codex nanti)

- **Bind 127.0.0.1** di script `dev` & `start`
- **Secrets**: `.env` di-gitignore, `.env.example` tanpa nilai asli, komentar eksplisit "server-side only"
- **Upload**: `storedFilename @unique` (siap untuk nama hashed), `storage/uploads` di-gitignore
- **Aksesibilitas**: skip link, `aria-current`, `aria-expanded`/`aria-label` pada toggle, label sr-only saat collapsed, focus ring tidak dihilangkan, `MotionConfig reducedMotion="user"`

## Tahap berikutnya (menunggu review kamu)

Tahap 2 = **upload dokumen & AI generation**: API route dengan Zod, validasi MIME + magic bytes + 20MB, parser per-format (`src/lib/parsing`), progress flow, form parameter generate, dan endpoint `/api/generate` dengan rate limiting.

Satu hal yang saya flag: **isi Dashboard tidak ada di SPEC.md** — saat ini placeholder. Kalau kamu punya ekspektasi konten tertentu (statistik dokumen/soal/sesi, shortcut, aktivitas terakhir), kasih tahu sebelum atau saat Tahap 2.

Silakan review — saya tunggu sebelum lanjut.
