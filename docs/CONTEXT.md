# CONTEXT.md — QuizForge

## Apa Ini?

QuizForge adalah platform open source, self-hosted, yang berjalan di localhost untuk menghasilkan soal ujian (pilihan ganda, isian singkat, esai) secara otomatis dari dokumen (PDF, DOCX, PPTX, XLSX) menggunakan AI. Soal yang dihasilkan bisa diekspor sebagai PDF atau dikerjakan langsung di platform melalui mode ujian interaktif dengan auto-grading.

## Mengapa Dibuat?

Sebagai mahasiswa Teknik Komputer semester 1 (Universitas Syiah Kuala) sekaligus freelance developer, pembuat project ini sering perlu membuat soal latihan dari materi kuliah (slide PPTX, modul PDF, catatan Word) untuk keperluan belajar mandiri maupun keperluan lain. Proses membuat soal secara manual memakan waktu — QuizForge mengotomasi proses tersebut sambil tetap memberi kontrol penuh (edit manual, regenerate, atur tingkat kesulitan) atas hasil akhirnya.

Project ini juga menjadi portofolio teknis: menunjukkan kemampuan membangun aplikasi fullstack AI-integrated dari nol, termasuk workflow pengembangan dengan bantuan multiple AI coding tools.

## Siapa Penggunanya?

**Single-user.** Dirancang untuk dipakai sendiri di localhost tanpa sistem login/autentikasi. Karena bersifat open source, orang lain bisa clone dan menjalankan instalasi mereka sendiri (juga single-user di instalasi masing-masing) — bukan platform multi-tenant/SaaS.

## Prinsip Desain Utama

1. **Localhost-first & aman secara default** — server hanya bind ke `127.0.0.1`, tidak ada expose ke jaringan. Karena tanpa auth, keamanan bertumpu pada isolasi localhost + validasi input yang ketat.
2. **Kontrol manusia tetap di tengah** — AI membantu generate soal, tapi user selalu bisa mengedit, regenerate, dan meninjau sebelum soal dipakai (baik untuk export maupun ujian).
3. **Reuse lewat question bank** — soal tidak sekali pakai. Tersimpan permanen, bisa ditag, dicari, dan dipakai ulang lintas dokumen/collection.
4. **Biaya AI terkendali** — default menggunakan model gratis (OpenRouter free-tier untuk teks, Gemini untuk pembacaan gambar/vision), plus rate limiting untuk mencegah biaya membengkak akibat bug.
5. **Kualitas profesional walau single-user** — UI/UX setara SaaS modern (shadcn/ui, WCAG 2.1 AA), testing (unit + E2E), dan audit keamanan formal sebelum dianggap stabil — karena project ini akan dipublikasikan sebagai open source dan jadi representasi kualitas kerja pembuatnya.

## Alur Kerja Pengembangan (Development Pipeline)

Project ini dikembangkan melalui pipeline tiga tahap dengan tiga AI coding tool berbeda:

1. **Qwen (Coding Awal)** — scaffold struktur project, implementasi fitur inti sesuai spec.
2. **Opencode (Revisi)** — merevisi & menyempurnakan bagian-bagian tertentu hasil scaffold Qwen.
3. **Codex (Audit Keamanan)** — mengaudit seluruh codebase terhadap checklist keamanan (lihat `DESIGN.md` bagian Keamanan) sebagai gate sebelum rilis publik.

Dokumen `ARCHITECTURE.md`, `SPEC.md`, dan `DESIGN.md` adalah kontrak bersama yang harus diikuti ketiga tool ini agar hasil akhirnya konsisten dan sesuai ekspektasi, meski dikerjakan oleh alat berbeda di tahap berbeda.

## Non-Goals (Sengaja Tidak Dikerjakan di Versi Awal)

- Multi-user / autentikasi / multi-tenant
- Deployment ke cloud/hosting publik (fokus 100% localhost)
- Export ke format selain PDF (Word/Excel — menyusul jika dibutuhkan)
- Model AI lokal (Ollama dll) — versi awal cloud-only (OpenRouter/Gemini)
- Ekstraksi gambar/diagram dari dokumen sumber ke dalam soal (hanya teks + metadata halaman/section)

## Referensi Dokumen Lain

- `ARCHITECTURE.md` — stack teknis, struktur folder, keputusan arsitektur
- `SPEC.md` — spesifikasi fitur lengkap, flow, dan struktur data
- `DESIGN.md` — desain UI/UX, sistem visual, dan checklist keamanan
