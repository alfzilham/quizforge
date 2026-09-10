# ARCHITECTURE.md — QuizForge

## Pendekatan Arsitektur

**Monolit Next.js murni.** Satu aplikasi Next.js (App Router) menangani UI dan API routes dalam satu proses/repo. Dipilih karena:

- Single-user, tidak butuh skalabilitas horizontal
- Setup manual (`npm run dev`) harus tetap sederhana bagi kontributor open source
- Satu codebase lebih mudah dikonsisten-kan lintas tiga AI coding tool (Qwen → opencode → Codex)

Tidak ada job queue (Redis/BullMQ) atau backend service terpisah di versi awal. Proses AI generation & grading esai berjalan sinkron dalam request API route (dengan progress feedback di UI selama proses berlangsung).

## Stack Teknis

| Layer         | Pilihan                                                                  | Alasan                                                                    |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router) + TypeScript                                     | Satu framework fullstack, ekosistem matang                                |
| ORM           | Prisma                                                                   | Type-safe, migrasi terkelola, cocok dengan PostgreSQL                     |
| Database      | PostgreSQL (native, bukan Docker)                                        | Lebih powerful dari SQLite, konsisten dengan pengalaman sebelumnya (Neon) |
| Styling       | Tailwind CSS                                                             | Utility-first, cocok dengan shadcn/ui                                     |
| Komponen UI   | shadcn/ui (berbasis Radix UI primitives)                                 | Accessible by default, dicustom styling sesuai desain                     |
| Ikon          | Lucide                                                                   | Ringan, stroke-based, native ke ekosistem shadcn                          |
| Smooth scroll | Lenis                                                                    | Diterapkan global di root layout                                          |
| Animasi       | Motion (Framer Motion) untuk komponen, CSS transition untuk hover ringan | Subtle & cepat (150–200ms)                                                |
| Validasi      | Zod                                                                      | Validasi di semua API routes sebelum data masuk ke Prisma                 |
| Testing unit  | Vitest                                                                   | Logic kritikal: parsing, grading rule-based, validasi                     |
| Testing E2E   | Playwright                                                               | Flow utama: upload→generate→export, upload→generate→ujian→submit          |
| AI Provider   | OpenRouter (model free-tier, teks) + Gemini (vision/gambar)              | Kontrol biaya, model dikonfigurasi per-task via `.env`                    |
| File storage  | Filesystem lokal (`./storage/uploads`)                                   | Localhost-only, tanpa cloud storage                                       |

## Library Parsing Dokumen

| Format | Library                                                         |
| ------ | --------------------------------------------------------------- |
| PDF    | `pdf-parse` atau `unpdf`                                        |
| DOCX   | `mammoth`                                                       |
| PPTX   | Custom extraction (PPTX = ZIP + XML) atau library `pptx-parser` |
| XLSX   | `xlsx` (SheetJS)                                                |

Semua hasil parsing disimpan sebagai teks + metadata (nomor halaman/section) — tanpa ekstraksi gambar di versi awal.

## Struktur Folder (Garis Besar)

```
quizforge/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/
│   │   │   ├── documents/
│   │   │   ├── question-bank/
│   │   │   ├── exams/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── documents/
│   │   │   ├── questions/
│   │   │   ├── generate/       # AI generation endpoint
│   │   │   ├── exams/
│   │   │   ├── grading/        # AI-grading esai endpoint
│   │   │   └── backup/         # export/import backup
│   │   └── layout.tsx          # root layout: Lenis, theme provider
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (customized)
│   │   └── ...                 # komponen spesifik fitur
│   ├── lib/
│   │   ├── parsing/            # per-format document parser
│   │   ├── ai/                 # AI client wrapper (OpenRouter, Gemini)
│   │   ├── validation/         # Zod schemas
│   │   ├── grading/            # rule-based grading logic
│   │   └── prisma.ts           # Prisma client singleton
│   └── types/
├── storage/
│   └── uploads/                # file dokumen (nama random, bukan nama asli)
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── SPEC.md
│   └── DESIGN.md
├── .env.example
└── package.json
```

## Konfigurasi Environment (`.env`)

```
DATABASE_URL=postgresql://...

# AI Provider — server-side only, tidak pernah dikirim ke client
OPENROUTER_API_KEY=
OPENROUTER_MODEL_GENERATE=      # model free-tier untuk generate soal
OPENROUTER_MODEL_GRADING=       # model free-tier untuk AI-grading esai
GEMINI_API_KEY=
GEMINI_MODEL_VISION=            # untuk pembacaan gambar/dokumen scan

# Server
HOST=127.0.0.1
PORT=3000

# Rate limiting
AI_GENERATION_RATE_LIMIT=       # maks request per menit
```

## Alur Data Tingkat Tinggi

```
Upload Dokumen → Validasi (MIME + magic bytes) → Parsing (teks + metadata)
    → Simpan ke Postgres (Document)
    → User pilih dokumen(s) + atur parameter generate (jumlah, proporsi tipe, bahasa)
    → API route panggil OpenRouter/Gemini → parse respons AI → simpan Question (versi awal)
    → User review: edit manual / regenerate (→ Question versi baru, histori tersimpan)
    → Soal masuk Question Bank (tag, difficulty, collection)
    → Pakai soal: Export PDF ATAU buat ExamSession
        → ExamSession: kerjakan linear, auto-save per soal, timer opsional (pause saat idle)
        → Submit: grading rule-based (MC/isian) instan + AI-grading (esai) sync
        → Hasil tersimpan sebagai ExamAnswer, bisa dilihat di riwayat
```

## Keputusan Arsitektur Kunci (ADR Ringkas)

- **Kenapa tanpa job queue?** Skala single-user, request AI generation tidak butuh antrian — cukup ditangani sinkron dengan feedback progress di UI. Menghindari dependency tambahan (Redis) yang memberatkan setup manual.
- **Kenapa Prisma + Postgres, bukan SQLite?** Postgres lebih robust untuk relasi kompleks (Question ↔ ExamAnswer ↔ Document ↔ Collection) dan konsisten dengan pengalaman project sebelumnya.
- **Kenapa monolit, bukan microservice?** Tiga AI coding tool (Qwen/opencode/Codex) akan lebih mudah bekerja pada satu codebase yang koheren daripada lintas beberapa service.
