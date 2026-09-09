# REPORT_FIX.md — Perbaikan atas Audit Codex Tahap 1

**Tanggal:** 10 September 2026
**Dasar:** `docs/notes/REPORT.md` (laporan audit Codex, status gate: FAIL)
**Scope:** branch `main`, hanya file Tahap 1. Tidak ada perubahan skema Prisma
atau keputusan desain final.
**Status:** Siap dikirim ke Codex untuk audit ulang.

---

## 1. TEMUAN #1 — Server bind bisa di-override ke 0.0.0.0 (High) → DIPERBAIKI

**Akar masalah:** `npm run dev -- <args>` menempelkan argumen SETELAH flag
hardcoded (`next dev -H 127.0.0.1 -p 3000 -H 0.0.0.0 ...`), dan parser Next
memenangkan flag terakhir. Uji env var Codex sendiri membuktikan env TIDAK
bisa override (PASS) — hanya forwarding argumen CLI yang bolong.

**Pendekatan yang dipilih: wrapper script (`scripts/local-server.js`).**
Alasan: Next.js TIDAK menyediakan opsi config untuk hostname (hanya CLI
`-H`/`--hostname`), sehingga `next.config.ts` tidak bisa mencegah override
CLI. Wrapper adalah satu-satunya titik yang bisa menegakkannya.

**Perilaku (fail-closed, sesuai arahan owner):**
- `-H` / `--hostname` dalam semua bentuk (terpisah, `--hostname=...`,
  menempel `-H...`) → error + exit 1, server TIDAK dijalankan.
- Argumen lain (termasuk `-p`/`--port`) tetap diteruskan — hanya HOST yang
  dikunci ke `127.0.0.1`, port boleh di-override (sesuai arahan owner).
- `package.json`: `dev`/`start` → `node scripts/local-server.js dev|start`.
- Batasan jujur: guard ini mencakup entry point resmi project
  (`npm run dev/start`). Operator lokal yang sengaja memanggil
  `npx next dev -H ...` langsung tetap bisa — itu di luar kemampuan guard
  script manapun, sama seperti operator bisa mengedit file apapun.

**Verifikasi (meniru skenario Codex):**

| Skenario | Hasil |
|---|---|
| `npm run dev -- -H 0.0.0.0 -p 4567` (skenario persis Codex) | **DITOLAK**, exit 1: `override hostname ditolak ("-H")...`. Server tidak jalan → tidak ada listener di `:4567` |
| `npm run dev -- --hostname=0.0.0.0` | **DITOLAK**, exit 1 |
| `npm run dev -- --hostname 0.0.0.0` | **DITOLAK**, exit 1 |
| `npm run dev -- -H0.0.0.0` | **DITOLAK**, exit 1 (catatan: PowerShell ikut memangle bentuk menempel menjadi `-H0`, tetap cocok pola penolakan) |
| `npm run dev` (normal) | Boot normal: `Local: http://127.0.0.1:3000`, `Network: http://127.0.0.1:3000` |
| `npm run dev -- -p 4567` (override port) | Boot di `http://127.0.0.1:4567` — host tetap terkunci |

Commit: `5f55814` — "fix: cegah override bind host ke 0.0.0.0 lewat argumen CLI".

---

## 2. TEMUAN #2 — Dependency hygiene (High) → DIPERBAIKI SEBAGIAN + TERDOKUMENTASI

`npm audit fix` mentah TIDAK dijalankan (menawarkan downgrade Prisma 7→6,
sudah ditolak). Sebagai gantinya, patch bertarget via `npm overrides`
(di `package.json`), yang memaksa versi patch TANPA mengubah major
Prisma/Next.js.

### 2.1. Tabel 6 advisory

| Advisory | Terinstal | Dipakai di runtime app? | Patch tanpa breaking? | Tindakan |
|---|---|---|---|---|
| `postcss` HIGH (+2 moderate: sourceMappingURL file-read, path traversal, XSS stringify) | 8.4.31 nested di `next@15.5.25` | Build-time (pipeline CSS Next.js/dev). CVE butuh CSS dari attacker — source CSS kita author-controlled; di localhost single-user, attacker = diri sendiri | ✅ Ya: override `postcss ^8.5.28` (versi sama yang sudah dipakai top-level; Next 15 mendukung range postcss 8.x) | **DIPATCH** via overrides → nested kini 8.5.28. Advisory `postcss` + `next` (moderate, inherited) HILANG dari audit |
| `mysql2` HIGH (auth downgrade) + MODERATE (zlib bomb) | 3.15.3 via `prisma` CLI | ❌ Tidak. Hanya dipakai Prisma CLI untuk datasource MySQL; project ini Postgres-only via `@prisma/adapter-pg` — kode mysql2 tidak pernah di-load | ✅ Ya: latest 3.x = 3.24.4 (> 3.23.0, menutup kedua range), tetap major 3 | **DIPATCH** via overrides → kini 3.24.4. Kedua advisory HILANG dari audit |
| `deepmerge-ts` HIGH (stack exhaustion, range `<8.0.0`) | 7.1.5 via `@prisma/config` | ❌ Tidak. Hanya dipakai Prisma CLI saat load `prisma7.config.ts` (file lokal tepercaya, bukan input attacker) | ❌ Tidak: fix butuh major 8.x, berisiko merusak Prisma CLI | **ACCEPTED RISK** (lihat §2.2) |
| `@prisma/config` HIGH, `prisma` HIGH | inherited | ❌ Dev-time CLI saja | — (ikut sembuh jika akar dipatch) | Sisa merujuk ke deepmerge-ts → **ACCEPTED RISK** |

### 2.2. Known accepted risk (tidak diam-diam diabaikan)

**R-1 — `deepmerge-ts@7.1.5` (HIGH, stack exhaustion).**
Alasan diterima: (1) hanya reachable via Prisma CLI dev-time
(`@prisma/config` me-merge file config lokal yang tepercaya — tidak ada input
luar/attacker yang bisa memicu recursive graph); (2) satu-satunya fix adalah
major bump 8.x yang berpotensi merusak CLI Prisma 7; (3) tidak ada advisory
untuk driver runtime aktual (`pg`, `@prisma/adapter-pg` bersih).
Rencana mitigasi: cabut status ini saat Prisma merilis versi yang menaikkan
`deepmerge-ts` ke 8.x; tinjau ulang tiap audit berikutnya.

### 2.3. Hasil audit sebelum → sesudah

- Sebelum: 6 advisory (5 high + 1 moderate).
- Sesudah: **3 advisory (3 high)** — semuanya berakar di `deepmerge-ts`
  (R-1 di atas). `fixAvailable` npm untuk ketiganya masih menunjuk downgrade
  Prisma → 6.x (major, DITOLAK).
- Verifikasi pasca-patch: `npm ls postcss/mysql2` sesuai versi override;
  `npx prisma generate` sukses; `npx tsc --noEmit` bersih;
  `npm run build` sukses (semua route ter-prerender).

Commit: `9e13378` — "fix: kunci postcss patched via npm overrides";
`767ed18` — "fix: kunci mysql2 patched via npm overrides".

---

## 3. GOVERNANCE — baris Graphify di .gitignore → DIPUTUSKAN: DIPERTAHANKAN

Investigasi lanjutan: direktori `graphify-out/` memang ADA di working tree
(cache knowledge-graph ±356KB: `graph.json`, `graph.html`, `GRAPH_REPORT.md`,
`manifest.json`) — dibuat oleh tooling Graphify di luar pipeline Tahap 1.
Baris `# Graphify` / `graphify-out/` masuk `.gitignore` tanpa dokumentasi
(tercatat di commit `474aece` karena `git add` menyapu perubahan working
tree yang pre-existing — bukan kesengajaan).

**Keputusan owner: JANGAN dihapus** — direktori ini adalah knowledge base
bagi AI yang akan memahami codebase project ini ke depannya.
Maka baris ignore DIPERTAHANKAN dengan alasan spesifik ini (inilah alasan
yang diminta temuan governance). Tidak ada perubahan file untuk poin ini.

---

## 4. TEMUAN LOW — skip-link focus style → DIPERBAIKI

Skip-link memakai `focus:*` tanpa `focus-visible:ring-*` seperti link sidebar.
Ditambah `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
focus-visible:ring-offset-2 focus-visible:ring-offset-background`, class lain
tidak diubah. `tsc` bersih.

Commit: `f51e1f6` — "fix: samakan focus ring skip-link dengan sidebar".

---

## 5. Re-verifikasi penuh (perintah yang sama seperti Codex)

| Perintah | Hasil |
|---|---|
| `npm run dev -- -H 0.0.0.0 -p 4567` | Ditolak, exit 1, tidak ada listener (lihat §1) |
| `npm run dev` | `Ready`, `Local/Network: http://127.0.0.1:3000` |
| `npm audit --json` | 3 high tersisa, semua berakar `deepmerge-ts` (R-1); `postcss`/`next`/`mysql2` bersih |
| `npx tsc --noEmit` | Bersih, 0 error |
| `npm run build` | `Compiled successfully`, semua route prerender |
| `npx prisma validate` / `prisma generate` | Valid + Client 7.10.0 tergenerate |

---

## 6. Daftar commit perbaikan (push sekali di akhir)

1. `5f55814` — fix: cegah override bind host ke 0.0.0.0 lewat argumen CLI
2. `9e13378` — fix: kunci postcss patched via npm overrides
3. `767ed18` — fix: kunci mysql2 patched via npm overrides
4. `f51e1f6` — fix: samakan focus ring skip-link dengan sidebar
5. docs: tambah REPORT_FIX.md (file ini)

**Di luar scope (konfirmasi, tanpa tindakan):** area Secrets, Upload, dan
Input Validation tetap PASS dan tidak berubah (belum ada endpoint API —
validasi MIME/magic-byte/Zod wajib diaudit ulang di Tahap 2, sesuai catatan
audit). Skema Prisma dan keputusan desain final tidak disentuh.
