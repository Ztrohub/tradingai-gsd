---
status: complete
completed_at: 2026-05-22
---

# Summary

Perbaikan weekly job agar watchlist minggu ini tampil otomatis setelah tombol ditekan.

Perubahan utama:
- Menambahkan polling status run sampai terminal (`succeeded`, `failed`, `skipped_overlap`, `canceled`) di `src/ui/public/app.js`.
- Tombol `Run Weekly Selection` sekarang:
  - queue run,
  - menunggu run selesai,
  - reload run history,
  - refresh panel watchlist saat sukses.
- Trigger manual `weekly` di tab Manual Runs sekarang juga menunggu run selesai dan refresh watchlist saat sukses.
- Menambahkan handling timeout agar user tahu run masih berjalan.

Verifikasi:
- `npm run test` passed.
- `npm run build` passed.
