# DESIGN.md — QuizForge

## 1. Bahasa Visual

- **Gaya**: Modern SaaS dashboard — mirip Notion/Linear. Sidebar kiri + area konten berbasis card.
- **Tema warna**: mengikuti `prefers-color-scheme` OS secara otomatis (light/dark), **tanpa toggle manual** di versi awal.
- **Warna aksen**: cerah di atas base netral — dipilih saat implementasi, konsisten dipakai untuk CTA, status aktif, highlight.
- **Tipografi**: sans-serif modern (mis. Inter atau Geist), hierarki jelas — heading tegas, body text mudah dibaca.
- **Ikon**: [Lucide](https://lucide.dev) — stroke-based, konsisten, ringan.

## 2. Layout

- **Sidebar kiri, collapsible**: bisa diciutkan dari mode full-label ke icon-only (mirip VS Code/Notion). Berisi navigasi utama:
  - Dashboard
  - Documents
  - Question Bank
  - Exams
  - Settings
- **Area konten kanan**: card-based, dengan header/breadcrumb per halaman.

## 3. Komponen Interaktif

Basis: **shadcn/ui** (dibangun di atas Radix UI primitives), di-custom styling agar konsisten dengan tema aksen platform.

Komponen yang dipakai (semua dari shadcn, restyled):

- Modal / Dialog
- Dropdown Menu
- Popover
- Toast (notifikasi)
- Command Palette (opsional — pencarian cepat soal/dokumen)
- Progress bar (upload & generate)
- Tabs, Accordion (question bank filter/detail)

### Scrollbar Kustom

Styling scrollbar tipis, rounded, warna mengikuti tema — via `::-webkit-scrollbar` (Chromium/Safari) dengan fallback properti standar untuk Firefox (`scrollbar-width`, `scrollbar-color`).

## 4. Motion

- **Smooth scroll**: [Lenis](https://lenis.darkroom.engineering/) diterapkan **global** di root layout — berlaku di seluruh halaman termasuk area kerja (editor soal, ujian).
- **Transisi**: subtle & cepat — durasi **150–200ms**, kombinasi fade + slide kecil. Dipakai untuk:
  - Modal/dialog muncul-hilang
  - Dropdown/popover terbuka-tutup
  - Page transition antar route (fade tipis, bukan animasi besar)
- **Library**: Motion (Framer Motion) untuk animasi komponen; CSS transition untuk hover state ringan (tombol, link).

## 5. Ikon Library

**Lucide** — dipilih karena sudah native di ekosistem shadcn/ui, ringan (tree-shakeable per-icon import), dan konsisten stroke-based dengan estetika modern SaaS yang dituju.

## 6. Aksesibilitas — WCAG 2.1 AA

Standar penuh diterapkan meski platform single-user, karena akan dipublikasikan sebagai open source dan menjadi representasi kualitas kerja.

Checklist wajib per fitur UI baru:

- [ ] Kontras warna teks/background memenuhi rasio minimum AA (4.5:1 teks normal, 3:1 teks besar/UI component)
- [ ] Semua elemen interaktif bisa dioperasikan penuh via keyboard (Tab, Enter, Escape, Arrow keys sesuai konteks)
- [ ] Focus indicator terlihat jelas di semua elemen fokusable (tidak dihilangkan oleh custom styling)
- [ ] Label ARIA yang tepat pada komponen non-native (custom dropdown, modal, dll — sudah sebagian besar didapat gratis dari Radix, tapi tetap diverifikasi)
- [ ] Form fields punya `<label>` yang terasosiasi dengan benar (bukan hanya placeholder)
- [ ] Struktur heading logis (h1 → h2 → h3, tidak lompat level)
- [ ] Konten dinamis (toast, progress update) diumumkan ke screen reader via `aria-live` yang sesuai

## 7. Checklist Keamanan

Ini adalah kontrak keamanan yang harus dipatuhi Qwen & opencode saat implementasi, dan menjadi checklist audit formal untuk Codex sebelum rilis publik.

### Server & Jaringan

- [ ] Server **hanya** bind ke `127.0.0.1`, tidak pernah `0.0.0.0`, di semua mode (dev & production build)
- [ ] Tidak ada endpoint yang sengaja/tidak sengaja expose ke jaringan lokal/publik

### Secrets & API Key

- [ ] API key (OpenRouter, Gemini) hanya ada di `.env` server-side
- [ ] Tidak pernah dikirim ke client/browser dalam bentuk apapun (termasuk di response API, source map, atau console log)
- [ ] `.env` masuk `.gitignore`, hanya `.env.example` (tanpa nilai asli) yang di-commit

### Upload & File Handling

- [ ] Validasi MIME type **dan** magic bytes (bukan hanya cek ekstensi file)
- [ ] Batas ukuran file maksimal ditegakkan (20MB)
- [ ] Nama file disimpan sebagai random/hashed string — nama asli user tidak pernah dipakai langsung sebagai path filesystem
- [ ] Path traversal dicegah (sanitasi nama file, validasi path tidak keluar dari direktori `storage/uploads`)
- [ ] File yang diupload tidak dieksekusi sebagai kode dalam kondisi apapun

### Input Validation

- [ ] Semua API routes memvalidasi input dengan Zod sebelum diproses/disimpan ke Prisma
- [ ] Query Prisma tidak membangun raw SQL dari input user tanpa parameterisasi

### Rate Limiting

- [ ] Endpoint generate soal & AI-grading dibatasi rate limit per menit (konfigurasi via `.env`)
- [ ] Rate limit tetap berlaku walau single-user (proteksi dari bug/loop, bukan dari serangan eksternal)

### Backup/Restore

- [ ] Fitur restore backup meminta konfirmasi eksplisit sebelum menimpa data existing
- [ ] File `.zip` backup yang diimpor divalidasi strukturnya sebelum diproses (cegah zip bomb / path traversal saat ekstraksi)

### Dependency Hygiene

- [ ] `npm audit` dijalankan secara berkala, dependency dengan kerentanan kritikal diperbarui/diganti
- [ ] Minimalkan dependency yang tidak esensial

### Audit Akhir

- [ ] Codex melakukan review menyeluruh terhadap seluruh checklist di atas sebagai gate sebelum project dianggap stabil untuk dipublikasikan/digunakan orang lain

## 8. Prinsip Desain Ringkas

- Cepat & fokus — animasi subtle, tidak mengganggu alur kerja (terutama saat mengerjakan ujian atau mengedit soal)
- Konsisten — satu sistem komponen (shadcn) dipakai di semua halaman, tidak ada styling ad-hoc yang menyimpang
- Accessible by default — memanfaatkan fondasi Radix, diverifikasi manual per fitur baru
- Aman by default — tidak ada fitur yang mengorbankan checklist keamanan demi kemudahan, meski platform ini single-user
