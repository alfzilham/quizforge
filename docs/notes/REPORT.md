# Laporan Audit Keamanan & Kualitas Tahap 1

**Auditor:** Codex  
**Tanggal:** 10 September 2026  
**Scope:** branch `main`, 14 commit Tahap 1 (`67e081a` sampai `14972de`)  
**Status gate:** **FAIL** — Tahap 1 belum layak dianggap stabil.

Catatan: file ini sudah kosong di working tree sebelum audit. Versi laporan implementasi sebelumnya tetap tersedia di Git `HEAD`.

## Ringkasan

| # | Area | Status | Severity tertinggi |
|---|---|---|---|
| 1 | Server & jaringan | **FAIL** | High |
| 2 | Secrets & API key | **PASS** | Info |
| 3 | Upload & file handling | **PASS** | Info |
| 4 | Input validation API | **PASS** | Info |
| 5 | Dependency hygiene | **FAIL** | High |
| 6 | Schema Prisma | **PASS** | Info |
| 7 | Aksesibilitas | **PASS** | Low |
| 8 | Governance `.gitignore` | **WARNING** | Low/Info |

## 1. Server & Jaringan — FAIL

Script `dev` dan `start` meng-hardcode `127.0.0.1:3000`.

Uji environment variable:

```powershell
$env:HOST='0.0.0.0'; $env:PORT='4567'; npm run dev
```

Hasil tetap:

```text
next dev -H 127.0.0.1 -p 3000
Local: http://127.0.0.1:3000
```

Namun uji berikut berhasil membuka jaringan:

```powershell
npm run dev -- -H 0.0.0.0 -p 4567
netstat -ano | Select-String ':4567'
```

Hasil:

```text
Network: http://0.0.0.0:4567
TCP  0.0.0.0:4567  0.0.0.0:0  LISTENING
```

Argumen tambahan diteruskan ke Next.js dan override argumen hardcoded. Ini melanggar requirement DESIGN.md bahwa server tidak pernah listen pada `0.0.0.0`.

Tidak ditemukan endpoint API aktual; `src/app/api/*` hanya berisi `.gitkeep`.

## 2. Secrets & API Key — PASS

Commands:

```powershell
git rev-list --objects --all
git log --all --full-history --name-status -- .env .env.* 'storage/uploads/*'
git check-ignore -v .env .env.local .env.production.local
```

Hasil:

- Tidak ada `.env` atau variasinya dalam seluruh history Git.
- `.env` dan variasinya di-ignore.
- Hanya `.env.example` yang tracked.
- Scan seluruh 14 commit tidak menemukan API key aktual, token `sk-*`, token `AIza*`, atau connection string dengan kredensial non-sample.
- `.env.example` hanya berisi key kosong dan connection string PostgreSQL lokal contoh.

## 3. Upload & File Handling — PASS

Commands:

```powershell
Get-ChildItem -Recurse public,storage
Get-ChildItem -Recurse src/app/api -File
```

Hasil:

- `storage/uploads/.gitkeep` ada.
- Tidak ada `public/uploads`.
- Tidak ada konfigurasi/symlink yang memetakan `storage/uploads` ke URL publik.
- Tidak ada endpoint upload aktual.
- `.gitignore` memakai `/storage/uploads/*` dengan pengecualian hanya untuk `.gitkeep`.

Validasi MIME, magic bytes, ukuran 20 MB, random filename, dan path traversal belum dapat diuji karena fitur upload belum dibuat. Area ini wajib diaudit ulang pada Tahap 2.

## 4. Input Validation API — PASS

Tidak ada `route.ts` atau handler API. Direktori API hanya berisi `.gitkeep`. Karena tidak ada endpoint yang menerima request, tidak ada endpoint placeholder yang melewati guard Zod.

## 5. Dependency Hygiene — FAIL

Commands:

```powershell
npm audit --json
npm audit --omit=dev --json
npm ls @prisma/adapter-pg pg next zod motion lenis --depth=0
```

Hasil:

```text
Critical: 0
High: 5
Moderate: 1
Low: 0
Total: 6
```

Temuan utama:

- `deepmerge-ts@7.1.5`: High, stack exhaustion pada recursive object graph.
- `@prisma/config@7.10.0`: High melalui `deepmerge-ts`.
- `mysql2@3.15.3`: High untuk auth plugin downgrade; juga Moderate untuk decompression-bomb DoS.
- `postcss@8.4.31` nested di Next: High/Moderate untuk arbitrary file read/path traversal/source-map dan XSS.
- `next@15.5.25`: Moderate melalui nested `postcss`.
- `prisma@7.10.0`: High melalui `@prisma/config` dan `mysql2`.

Versi adaptasi Prisma:

```text
@prisma/adapter-pg@7.10.0
pg@8.23.0
prisma@7.10.0
@prisma/client@7.10.0
```

Tidak ada advisory npm yang dilaporkan untuk `@prisma/adapter-pg` atau `pg`. Fix otomatis npm menawarkan `prisma@6.19.3`, yaitu downgrade major, sehingga tidak boleh diterapkan otomatis. Adaptasi Motion dan Tooltip tidak menunjukkan downgrade keamanan.

## 6. Schema Prisma — PASS dengan batasan verifikasi

Commands:

```powershell
npx prisma validate
npx prisma generate
```

Hasil:

```text
The schema at prisma/schema.prisma is valid
Generated Prisma Client (7.10.0)
```

Audit independen mengonfirmasi:

- `DocumentQuestion` adalah join table eksplisit.
- Tag melekat pada `Question` melalui `QuestionTag`, bukan `QuestionVersion`.
- `ExamSessionQuestion` memiliki `position`.
- Relasi Question dari `ExamSessionQuestion` dan `ExamAnswer` memakai `onDelete: Restrict`.
- Penghapusan Document memutus link `DocumentQuestion`; source version memakai `SetNull`.
- `sourceDocumentId` dan `sourceReference` adalah dua field terpisah.
- `currentVersionId` eksplisit dan `@unique`.
- Relasi Collection ke Document dan Question memakai `Restrict`.

Migrasi database belum dijalankan karena PostgreSQL belum tersedia; perilaku constraint aktual belum diuji di database.

## 7. Aksesibilitas — PASS dengan temuan Low

Evidence kode:

- Sidebar memiliki `aria-label="Navigasi utama"`.
- Link aktif memakai `aria-current="page"`.
- Link sidebar memiliki `focus-visible:ring-2`.
- Label icon-only tetap tersedia melalui `sr-only`.
- Tombol collapse memiliki `aria-label` dan `aria-expanded`.
- Button primitive memiliki `focus-visible:ring-3`.
- `PageHeader` merender `<h1>`.
- Skip-link menuju `#konten-utama`, dan `<main>` memiliki target tersebut.

Temuan Low: skip-link memakai `focus:*` untuk state terlihat tetapi tidak memiliki class `focus-visible:ring-*` seperti link sidebar. Ia tetap memiliki indikator fokus melalui perubahan posisi/background.

## 8. Governance `.gitignore` — WARNING

Commands:

```powershell
git blame -L 48,55 -- .gitignore
git show 474aece^:.gitignore
git show 474aece -- .gitignore
```

Hasil:

- Baris `# Graphify` dan `graphify-out/` masuk pada commit `474aece`.
- Commit tersebut membahas artefak skill Prisma 7, bukan Graphify.
- Tidak ada file Graphify di tree atau history repository.
- Rule tersebut tampak harmless, tetapi asalnya tidak terdokumentasi dan tidak terkait project QuizForge.

Severity Low/Info: owner perlu memutuskan apakah rule ini dihapus untuk menjaga governance `.gitignore`.

## Verifikasi Tambahan

```powershell
npx tsc --noEmit
```

Hasil: sukses tanpa error. Tidak ada source code yang diubah oleh audit.

## Keputusan Akhir

Tahap 1 **FAIL sebagai security gate** sampai minimal dua isu berikut ditangani:

1. Cegah forwarding argumen `-H`/`--hostname` yang dapat mengubah bind menjadi `0.0.0.0`.
2. Tinjau dan remediasi dependency advisory, khususnya Prisma CLI/transitif dan nested PostCSS.
