# PRD — JobMail Tracker (Android, Zero-Login)

## Problem Statement
Aplikasi Android ultra-minimalist (monokrom black/white/zinc, task-oriented) untuk melacak email lamaran kerja. Versi Zero-Login: TANPA Google OAuth. Seluruh komunikasi data via HTTP GET/POST ke URL Web App Google Apps Script (GAS) milik pengguna.

## Architecture
- **Frontend**: Expo Router (React Native), 3 tab (Lamaran / Referensi / Inbox) + layar Setup + layar Detail Email.
- **Backend**: FastAPI yang MENGEMULASI kontrak GAS Web App persis di `/api/gas` (GET `?action=getAllData`, POST action-based). MongoDB 3 koleksi (log, referensi, inbox) di-seed data demo.
- **State**: `DataContext` global (fetch, addLamaran, triggerKirim, syncReferensi, updateFollowUp) + foreground polling untuk notifikasi lokal inbox baru.
- **Koneksi**: URL GAS disimpan di local storage (`jobmail_gas_url`). Layar Setup punya tombol "Coba dengan Data Demo" (pakai backend emulator).

## User Persona
Pencari kerja yang mengirim banyak lamaran via Google Sheets + GAS dan ingin memantau status kirim & balasan HRD dari HP.

## Core Requirements (static)
- Zero-login, HTTP-only ke GAS Web App.
- Log Pengiriman: kartu to-do, status badge, circular checkbox trigger kirim.
- Form tambah lamaran (bottom sheet), validasi wajib Email/Perusahaan/Posisi, chip PDF multi-select drag-reorder.
- Referensi Berkas + Synchronize Drive.
- Inbox HRD: category dots, detail + highlight poin kunci + Buka di Gmail + sticky follow-up input.
- Notifikasi lokal saat baris Email Masuk bertambah.

## Implemented (2026-06-08)
- ✅ Backend GAS emulator lengkap (getAllData, addLamaran, triggerKirim, syncReferensi, updateStatusTindakLanjut) — 9/9 tes lulus.
- ✅ Layar Setup + demo connect.
- ✅ Home Log Pengiriman: kartu, badge warna sesuai spec, circular checkbox (disabled saat Terkirim), FAB, Sync header, pull-to-refresh, empty/loading/error state.
- ✅ Bottom sheet form + validasi 3 field wajib + chip drag-reorder + append ke sheet.
- ✅ Referensi Berkas + Synchronize Drive + ganti koneksi.
- ✅ Inbox HRD + Detail + highlight poin kunci + Buka di Gmail + sticky follow-up input.
- ✅ Notifikasi lokal via foreground polling (90s).

## Backlog / Remaining
- P1: Integrasi GAS Web App asli milik pengguna (tinggal ganti URL di Setup — kontrak sudah identik).
- P1: Notifikasi background (butuh native build; foreground sudah jalan).
- P2: Filter/segment status di Home; pencarian inbox.
- P2: Migrasi FAB shadow ke boxShadow (peringatan web-only, non-blocking).

## Next Tasks
- Sambungkan URL GAS asli & verifikasi round-trip read/write.
- Tambah filter status di Home.
