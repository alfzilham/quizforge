# SPEC.md — QuizForge

## 1. Ringkasan Fitur

1. Upload & parsing dokumen (PDF, DOCX, PPTX, XLSX)
2. Generate soal via AI (MC, isian singkat, esai) dari satu atau lebih dokumen
3. Question Bank (penyimpanan, tag, difficulty, pencarian, versi/histori)
4. Edit manual & regenerate soal
5. Export soal ke PDF
6. Mode ujian interaktif (timer opsional, auto-grading, riwayat)
7. Backup & restore data (export/import via UI)
8. Pengaturan (API key, model AI, rate limit) — via `.env`, bukan UI

## 1a. Dashboard

Halaman pertama yang tampil saat membuka platform (route `/`). Berfungsi sebagai kilas balik aktivitas terbaru, bukan halaman aksi utama — navigasi kerja tetap lewat sidebar.

### Layout

Tiga section berdampingan, masing-masing menampilkan aktivitas terbaru per kategori:

1. **Dokumen Terbaru**
2. **Soal Terbaru**
3. **Ujian Terbaru**

### Header Section

Setiap section menampilkan judul + badge angka total, contoh: **"Dokumen Terbaru · 12 total"**. Angka total merefleksikan jumlah keseluruhan record pada kategori tersebut (bukan hanya yang ditampilkan).

### Isi Section

- Menampilkan maksimal **10 item terbaru**, diurutkan dari waktu terbaru ke terlama.
- Jika total item pada kategori lebih dari 10, tampilkan tombol **"Lihat semua"** yang mengarah ke halaman penuh kategori tersebut (Documents / Question Bank / Exams).
- Jika kategori belum memiliki data sama sekali, tampilkan empty state yang sesuai (mis. "Belum ada dokumen — upload dokumen pertama Anda").

### Field per Item

| Kategori | Field yang ditampilkan |
|---|---|
| **Dokumen** | Nama file, status (`processing` / `ready` / `failed`), waktu upload (relatif, mis. "2 jam lalu") |
| **Soal** | Potongan teks soal (truncated), tipe soal (MC / isian singkat / esai), nama collection asal |
| **Ujian** | Nama sesi atau tanggal pengerjaan, skor akhir (jika sudah completed), status (`in_progress` / `completed`) |

### Interaksi

Setiap item dapat diklik dan mengarahkan ke halaman detail terkait:

- **Dokumen** → halaman detail dokumen tersebut (`/documents/[id]`)
- **Soal** → halaman edit soal di Question Bank (`/question-bank/[id]`)
- **Ujian** → halaman riwayat/hasil sesi tersebut (`/exams/[id]/result`)

### Sumber Data

Data diambil langsung dari tabel `Document`, `Question` (beserta `QuestionVersion` aktif untuk potongan teks & tipe), dan `ExamSession` — diurutkan berdasarkan `createdAt`/`updatedAt` terbaru, dibatasi (`LIMIT 10`) per kategori, plus query `COUNT(*)` terpisah untuk badge total.

## 2. Organisasi Data

- **Collection** — folder pengelompokan dokumen (mirip file manager). Soal mewarisi collection dari dokumen asalnya.
- **Document** — file yang diupload user, hasil parsing (teks + metadata halaman/section), status (processing/ready/failed).
- **Question** — satu soal, dengan versi/histori (lihat §5).
- **ExamSession** — satu sesi pengerjaan ujian.
- **ExamAnswer** — jawaban per soal dalam satu ExamSession.

## 3. Upload Dokumen

### Format Didukung
PDF, DOCX, PPTX, XLSX.

### Validasi
- Cek MIME type **dan** magic bytes (bukan hanya ekstensi file)
- Batas ukuran maksimal: 20MB per file
- Nama file disimpan sebagai random/hashed string (bukan nama asli), nama asli disimpan terpisah sebagai metadata display
- Sanitasi nama file asli untuk mencegah path traversal

### Alur & Progress
Progress bar real-time menampilkan tahap: **Upload → Validasi → Parsing → Selesai**.

Jika gagal di tahap manapun (mis. PDF hasil scan tanpa teks, file corrupt):
- Tampilkan pesan error spesifik (tahap mana yang gagal, kenapa)
- Dokumen **tidak** masuk daftar dokumen
- Tombol "Coba lagi" untuk retry upload dari awal

### Hasil Parsing
Disimpan sebagai teks + metadata referensi (nomor halaman untuk PDF, section/slide untuk PPTX, sheet/baris untuk XLSX, heading untuk DOCX). Tidak ada ekstraksi gambar/diagram di versi awal.

## 4. Generate Soal via AI

### Input dari User (form sebelum generate)
- Pilih satu atau lebih dokumen dalam collection yang sama (digabung jadi satu konteks generate)
- Jumlah total soal
- Proporsi tipe soal: MC / isian singkat / esai (user atur bebas, mis. 5 MC + 3 isian + 2 esai)
- Bahasa: Indonesia atau English (dropdown)

### Proses
1. Teks hasil parsing dari dokumen terpilih dikirim sebagai konteks ke model AI (default: OpenRouter free-tier model)
2. AI menghasilkan soal sesuai jumlah & proporsi yang diminta, termasuk:
   - Teks soal
   - Opsi jawaban (untuk MC)
   - Kunci jawaban
   - **Penjelasan** kenapa jawaban benar, dan (khusus MC) kenapa setiap opsi lain salah
   - **Difficulty** (mudah/sedang/sulit) — ditentukan otomatis oleh AI
   - Referensi sumber (dokumen + section/halaman asal)
3. Soal masuk Question Bank sebagai versi pertama (v1), berstatus draft — siap direview

### Progress & Error
Selama proses generate berlangsung (bisa memakan beberapa detik–menit tergantung jumlah soal), tampilkan indikator progress. Jika API AI gagal/timeout, tampilkan error jelas dan opsi retry.

## 5. Question Bank

### Struktur Soal
- Tipe: `multiple_choice` | `short_answer` | `essay`
- Field umum: teks soal, kunci jawaban, penjelasan, difficulty, tag (bebas, banyak), collection (mewarisi dari dokumen sumber), sumber referensi
- Khusus MC: array opsi (dengan penanda opsi benar), penjelasan per opsi salah

### Versi & Histori
- Setiap **edit manual** atau **regenerate via AI** pada satu soal membuat versi baru
- Versi sebelumnya tetap tersimpan dan bisa dilihat kapan saja
- User bisa rollback ke versi sebelumnya (menjadikannya versi aktif baru, bukan menghapus histori)

### Pencarian & Filter
- Filter by: collection, tag, tipe soal, difficulty
- Pencarian teks bebas (judul/isi soal)

### Edit Manual
User bisa mengubah: teks soal, opsi (MC), kunci jawaban, penjelasan, difficulty, tag — melalui form edit, tersimpan sebagai versi baru.

### Regenerate
Tombol "Regenerate" pada satu soal memicu AI membuat ulang soal tersebut (dengan konteks dokumen asal yang sama) — hasil baru menjadi versi baru, bukan soal terpisah.

## 6. Export PDF

- User pilih soal (dari Question Bank atau langsung dari hasil satu sesi generate) untuk dimasukkan ke dokumen ekspor
- Format: **satu dokumen PDF gabungan** — setiap soal diikuti langsung oleh kunci jawaban dan penjelasan di bawahnya
- Tidak ada opsi pisah dokumen soal/kunci di versi awal (bisa jadi enhancement nanti)

## 7. Mode Ujian Interaktif

### Membuat Sesi (ExamSession)
- User pilih soal-soal dari Question Bank untuk dimasukkan ke satu sesi ujian
- Timer: opsional, default **off**. Jika diaktifkan, user set durasi total sesi.

### Mengerjakan
- Navigasi **linear**: satu soal per layar, tombol Next/Prev, tidak bisa lompat bebas ke nomor manapun
- Auto-save jawaban setiap kali pindah soal (next/prev) — tersimpan ke `ExamAnswer` di database
- Jika timer aktif dan sesi ditinggalkan (browser ditutup/tab pindah lama), timer **di-pause otomatis**, lanjut hitung mundur saat sesi dibuka kembali (bukan real-time berjalan di server)
- Sesi bisa dilanjutkan kapan saja dari soal terakhir yang dikerjakan

### Submit & Grading
- Saat submit (manual atau otomatis saat timer habis):
  - Soal **MC** dan **isian singkat**: grading rule-based, skor tampil **instan**
  - Soal **esai**: dikirim ke AI-grading (sync, dalam beberapa detik), menghasilkan skor + feedback tekstual
- Halaman hasil menampilkan skor total, breakdown per soal, jawaban user vs kunci jawaban, dan feedback (untuk esai)

### Riwayat Ujian
- Semua ExamSession yang sudah diselesaikan tersimpan permanen
- Halaman riwayat menampilkan: skor, jawaban per soal, feedback AI, waktu pengerjaan, tanggal
- Bisa dibuka kembali kapan saja untuk review

## 8. Backup & Restore

- **Export**: tombol di Settings men-generate `.zip` berisi dump database (Postgres) + seluruh folder `storage/uploads`
- **Import**: upload `.zip` backup untuk restore penuh (menimpa/menggabung data — perilaku pasti ditentukan saat implementasi, minimal harus ada konfirmasi eksplisit sebelum menimpa data existing)

## 9. Rate Limiting & Kontrol Biaya AI

- Endpoint generate soal & AI-grading dibatasi rate limit per menit (dikonfigurasi via `.env`)
- Tujuan: mencegah biaya API membengkak akibat bug, infinite loop, atau double-submit tidak sengaja

## 10. Struktur Data (Model Level)

```
Collection
  - id, name, createdAt

Document
  - id, collectionId, originalFilename, storedFilename (random),
    fileType (pdf/docx/pptx/xlsx), status (processing/ready/failed),
    errorMessage?, parsedContent (teks + metadata halaman/section), createdAt

Question
  - id, documentIds[] (sumber, bisa multiple), collectionId,
    type (multiple_choice/short_answer/essay),
    currentVersionId, versions: QuestionVersion[]

QuestionVersion
  - id, questionId, versionNumber,
    text, options? (untuk MC: [{text, isCorrect, explanation}]),
    correctAnswer, explanation, difficulty (easy/medium/hard),
    tags[], sourceReference (documentId + page/section),
    createdBy (manual_edit/ai_generate/ai_regenerate), createdAt

ExamSession
  - id, questionIds[], timerEnabled, timerDurationSeconds?,
    timerRemainingSeconds? (untuk pause/resume),
    status (in_progress/completed), startedAt, completedAt?

ExamAnswer
  - id, examSessionId, questionId, userAnswer,
    isCorrect? (untuk MC/isian, rule-based),
    aiScore? (untuk esai), aiFeedback? (untuk esai),
    answeredAt
```

## 11. Alur Pengguna End-to-End (Ringkasan)

**Alur A — Export:**
Upload dokumen → tunggu parsing selesai → pilih dokumen → set parameter generate → generate soal → review/edit di Question Bank → pilih soal → export PDF

**Alur B — Ujian:**
Upload dokumen → generate soal → review/edit → buat ExamSession (pilih soal, set timer opsional) → kerjakan linear dengan auto-save → submit → lihat hasil (instan + AI-grading esai) → tersimpan di riwayat
