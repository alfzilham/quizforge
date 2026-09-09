# REPORT.md — Laporan Implementasi Tahap 1 QuizForge

**Tanggal:** 9–10 September 2026
**Pelaksana:** Opencode (tahap Revisi/eksekusi), berdasarkan rencana Qwen (`docs/notes/QWEN_OUTPUT.md`)
**Sumber spec:** `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/SPEC.md`, `docs/DESIGN.md`
**Branch:** `main` → `https://github.com/alfzilham/quizforge`
**Status:** Selesai, seluruh perubahan tercommit & terpush. Berhenti sebelum Tahap 2.

---

## 1. Ringkasan

Tahap 1 (fondasi project) telah diterapkan penuh ke repo nyata sesuai urutan
Langkah 1–6 di `QWEN_OUTPUT.md`:

- Scaffold Next.js 15 (App Router, TypeScript, Tailwind, src-dir, alias `@/*`)
- Install dependency runtime + dev (Prisma, Zod, Lenis, Motion, dsb.)
- Setup shadcn/ui + 4 komponen awal
- Struktur folder sesuai `ARCHITECTURE.md` + `.gitkeep`
- Schema Prisma lengkap (10 model, 6 enum) + `prisma7.config.ts`
- Konfigurasi keamanan default (bind `127.0.0.1`, `.env` di-gitignore, `.env.example`)
- Tema indigo + scrollbar kustom, root layout (theme provider, Lenis, Motion),
  sidebar collapsible + page header + dashboard layout, 5 halaman placeholder,
  Prisma singleton, dan README.

Total **14 commit granular**, semuanya sudah dipush ke `origin/main`.

**Satu langkah yang SENGAJA dilewati (dengan izin owner):** `prisma migrate dev`
tidak dijalankan karena PostgreSQL belum terinstal di mesin ini. Sebagai
pengganti, schema diverifikasi via `prisma validate` + `prisma generate`
(keduanya sukses tanpa koneksi DB). Perintah migrasi siap jalan
(`npm run db:migrate`) begitu `DATABASE_URL` di `.env` valid.

**Tidak ada desain ulang.** Semua keputusan final di spec dipertahankan
(schema Prisma, cascade behavior, tag di Question bukan QuestionVersion,
sourceReference split, currentVersionId eksplisit — sesuai komentar di
`prisma/schema.prisma`). Tiga perbaikan yang dilakukan murni adaptasi teknis
agar kode kompilasi dengan versi dependency aktual (detail di §4).

---

## 2. Riwayat Commit (14 commit, urut kronologis)

| # | Hash | Pesan | Isi |
|---|------|-------|-----|
| 1 | `67e081a` | init: setup Next.js 15 dengan TypeScript, Tailwind, App Router | `git init`, `create-next-app@15` (via direktori temp `quizforge-tmp` karena npm menolak nama berhuruf kapital, lalu file dipindah ke root), hapus boilerplate (`page.tsx`, SVG) |
| 2 | `544883b` | deps: tambah dependency utama (prisma, zod, lenis, motion, lucide, geist) | `@prisma/client`, `zod`, `lenis`, `next-themes`, `geist`, `motion`, `lucide-react`, `tw-animate-css`, dev: `prisma` |
| 3 | `18c800e` | ui: setup shadcn/ui dengan tema new-york + komponen awal (button, card, separator, tooltip) | `shadcn init` + add `button card separator tooltip`, `components.json`, `src/lib/utils.ts` |
| 4 | `2c4dd42` | struktur: buat folder layout sesuai ARCHITECTURE.md dengan .gitkeep | `src/lib/{parsing,ai,validation,grading}`, `storage/uploads`, `tests/{unit,e2e}`, `src/app/api/{documents,questions,generate,exams,grading,backup}` |
| 5 | `59ac8d6` | prisma: tambah schema awal dengan 6 model inti + 3 join table | `prisma/schema.prisma` lengkap + `prisma7.config.ts` |
| 6 | `33da70e` | konfigurasi: bind 127.0.0.1, env.example, gitignore lengkap | script `dev`/`start` hardcode `-H 127.0.0.1 -p 3000` + script `db:*`, `.env.example`, `.gitignore` |
| 7 | `3d96bc0` | theme: tambah token tema indigo + scrollbar kustom | `src/app/globals.css` (token indigo light/dark, scrollbar WebKit + Firefox) |
| 8 | `9f890a8` | layout: root layout dengan theme provider, Lenis smooth scroll, page transition | `layout.tsx`, `theme-provider.tsx`, `smooth-scroll.tsx`, `layout/page-transition.tsx` |
| 9 | `764cd64` | layout: sidebar navigasi collapsible + page header + dashboard layout | `layout/app-sidebar.tsx`, `layout/page-header.tsx`, `(dashboard)/layout.tsx` (dengan skip-link) |
| 10 | `fecc034` | pages: tambah placeholder untuk semua route dashboard | 5 halaman: `/`, `/documents`, `/question-bank`, `/exams`, `/settings` |
| 11 | `3d60b81` | lib: tambah prisma singleton dan types placeholder | `src/lib/prisma.ts`, `src/types/index.ts` |
| 12 | `a5c0c3f` | docs: tambah README | `README.md` (prasyarat, cara jalan, catatan bind 127.0.0.1) |
| 13 | `474aece` | chore: abaikan artefak skill Prisma 7, prisma7.config.ts tetap di-track | `.gitignore`: ignore `.agents/`, `.claude/`, `.windsurf/`, `skills-lock.json`; hapus baris ignore `prisma7.config.ts` yang sudah terlanjur di-track |
| 14 | `14972de` | fix: sesuaikan prisma singleton dengan API Prisma 7 (driver adapter pg) | `package.json` + `src/lib/prisma.ts` (detail di §4) |

---

## 3. Hasil Checklist Verifikasi Tahap 1

| # | Poin checklist | Hasil | Bukti |
|---|----------------|-------|-------|
| 1 | Terminal menampilkan `Ready on http://127.0.0.1:3000` (bukan `0.0.0.0`) | **LULUS** | `npm run dev` aktual menampilkan `Local: http://127.0.0.1:3000` dan `Network: http://127.0.0.1:3000`. Script `dev`/`start` di `package.json` meng-hardcode `-H 127.0.0.1 -p 3000` |
| 2 | `prisma studio` → 6 model inti + join table + 6 enum | **LULUS SEBAGIAN** | `studio`/`migrate` tak bisa jalan tanpa PostgreSQL. Pengganti: `prisma validate` → "schema valid 🚀"; `prisma generate` → Prisma Client 7.10.0 sukses tanpa DB. Schema: 10 model (Collection, Document, DocumentQuestion, Question, QuestionVersion, Tag, QuestionTag, ExamSession, ExamSessionQuestion, ExamAnswer) + 6 enum (QuestionType, Difficulty, DocumentStatus, FileType, ExamStatus, VersionAuthor) |
| 3 | Sidebar 5 item, active indigo, collapse persist, tooltip icon-only | **LULUS (level kode)** | 5 item di `NAV_ITEMS`; active `bg-primary/10 text-primary`; persist via `localStorage quizforge.sidebar.collapsed`; `TooltipContent side="right"` saat collapsed. Belum uji visual browser |
| 4 | Dark mode OS → tema otomatis, tanpa toggle | **LULUS (level kode)** | `ThemeProvider defaultTheme="system" enableSystem`; grep `setTheme\|useTheme\|ModeToggle` di `src/` kosong |
| 5 | Keyboard nav, focus ring indigo, skip-link | **LULUS (level kode)** | Skip-link "Lewati ke konten utama" → `#konten-utama`; `focus-visible:ring-2 ring-ring`; `aria-current`, `aria-expanded`, `aria-label`, `sr-only` terpasang |
| 6 | `git status` → `.env` & `storage/uploads/*` tak terlacak | **LULUS** | `git check-ignore` konfirmasi keduanya diabaikan; hanya `.env.example` yang di-track |

**Verifikasi tambahan (di luar checklist):** `npx tsc --noEmit` bersih (0 error);
`npm run build` sukses — 5 route + root ter-prerender sebagai static
(`First Load JS` bersama 102 kB).

---

## 4. Perbaikan Teknis Selama Eksekusi

Tiga perbaikan di bawah ini adalah adaptasi terhadap versi dependency aktual,
**bukan** perubahan keputusan desain:

1. **Motion `ease: "ease-out"` → `"easeOut"`** (`page-transition.tsx`) —
   Motion versi baru menolak string easing gaya CSS; TypeScript error saat
   kompilasi. Perilaku animasi (fade + slide 180ms) tidak berubah.
2. **API Tooltip shadcn v4** (`app-sidebar.tsx`) — shadcn terbaru memakai
   `@base-ui/react` bukan Radix: prop `delayDuration` → `delay`, dan
   `TooltipTrigger asChild` → `render={<span />}`. Tanpa ini build gagal
   type-check. Tampilan/perilaku tooltip sama.
3. **Prisma 7 vs output Qwen (era Prisma 6)** —
   - generator `prisma-client-js` → `prisma-client` + file `prisma7.config.ts`;
   - import client dari `@/generated/prisma/client` (Prisma 7 tidak lagi
     menyediakan barrel `index`);
   - konstruktor `new PrismaClient()` wajib driver adapter → tambah
     `@prisma/adapter-pg` + `pg` (+ `@types/pg`), singleton memakai
     `new PrismaPg({ connectionString: process.env.DATABASE_URL })`.
   
   Pola singleton dan seluruh schema tidak diubah.

**Keputusan terkait artefak tooling:** `npx prisma init` otomatis menginstal
skill Prisma 7 (`.agents/`, `.claude/`, `.windsurf/`, `skills-lock.json`).
Itu bukan bagian spec Tahap 1, jadi di-gitignore (commit `474aece`),
tidak dicommit.

---

## 5. Yang Belum / Catatan

- **Migrasi DB** (`npx prisma migrate dev --name init`) menunggu PostgreSQL
  lokal terinstal + `.env` terisi. Langkah: `cp .env.example .env`,
  sesuaikan `DATABASE_URL`, `npm run db:migrate`.
- **Poin 3–5 checklist** lulus verifikasi kode, belum uji visual/browser —
  disarankan verifikasi manual atau Playwright setelah DB tersedia.
- **File `docs/notes/REPORT.md` (file ini)** — sebelumnya kosong dan bukan
  buatan pipeline Tahap 1 (kemungkinan dari tooling lain); kini diisi laporan
  ini atas permintaan owner.
- **Baris `# Graphify` / `graphify-out/` di `.gitignore`** — tambahan eksternal
  yang muncul setelah commit konfigurasi; dipertahankan karena harmless.
- **Flag dari Qwen (belum diputuskan):** isi Dashboard tidak didefinisikan di
  `SPEC.md` — saat ini placeholder. Perlu ekspektasi owner sebelum Tahap 2.

---

## 6. Saran Terpisah (tidak diterapkan, menunggu persetujuan)

1. **Upgrade Node.js 20 → 22 LTS.** Prisma 7 (`@prisma/streams-local`)
   me-warning `EBADENGINE` (butuh Node ≥ 22) di Node 20.20.2 saat ini.
   Tidak fatal, tapi layak di-upgrade sebelum Tahap 2.
2. **Jangan upgrade ke Prisma 8 RC** (`8.0.0-rc.13` ditawarkan saat generate) —
   tetap di 7.10.0 yang stabil.
3. **Konten Dashboard** — putuskan sebelum Tahap 2: statistik
   dokumen/soal/sesi, shortcut, atau aktivitas terakhir.
