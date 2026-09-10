# KNOWN_RISKS.md — Daftar Accepted Risk QuizForge

File ini adalah register **hidup**: setiap entry accepted-risk wajib
**ditinjau ulang di setiap milestone/tahap berikutnya** sebelum tahap
dinyatakan selesai. Entry tidak boleh dihapus tanpa keputusan owner yang
tercatat (tanggal + alasan penutupan).

Format per entry: ID, deskripsi, alasan diterima, kondisi pemicu tinjau
ulang, tanggal diterima, status.

---

## R-1 — `deepmerge-ts@7.1.5` (HIGH, stack exhaustion)

- **Deskripsi:** `deepmerge-ts` (< 8.0.0, GHSA-ggr8-5vv4-36mx) stack exhaustion
  saat me-merge recursive object graph. Muncul sebagai 3 advisory HIGH di
  `npm audit` (`deepmerge-ts` langsung + inherited via `@prisma/config` dan
  `prisma`). Satu-satunya fix adalah major bump ke 8.x.
- **Alasan diterima:**
  1. Dev-time only — hanya reachable via Prisma CLI (`@prisma/config`)
     saat me-load `prisma7.config.ts`.
  2. Tidak reachable dari layer HTTP — tidak ada endpoint yang memicu code
     path ini.
  3. Input yang di-merge adalah file config lokal tepercaya, bukan input
     attacker.
  4. Shell access = kontrol penuh — DoS lokal via config crafted bukan
     threat realistis untuk single-user localhost.
  5. Major bump 8.x berisiko merusak Prisma CLI 7; downgrade Prisma → 6.x
     sudah ditolak (breaking).
- **Kondisi pemicu tinjau ulang:**
  - Setiap milestone/tahap berikutnya (wajib).
  - Apabila ada perubahan yang menyentuh Prisma config loading.
  - Apabila upstream merilis fix (`@prisma/config` memakai `deepmerge-ts`
    8.x, atau advisory dicabut).
- **Tanggal diterima:** 10 September 2026 (keputusan owner, Tahap 1).
- **Status:** DITERIMA, terbuka, wajib review tiap tahap.
