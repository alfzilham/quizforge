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
