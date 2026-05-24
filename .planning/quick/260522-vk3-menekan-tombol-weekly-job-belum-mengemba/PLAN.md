---
quick_id: 260522-vk3
status: complete
created: 2026-05-22
---

# Quick Plan

Perbaiki alur weekly job di UI agar watchlist minggu ini benar-benar muncul setelah tombol ditekan:
- Identifikasi dan tunggu run weekly sampai status terminal (`succeeded`/`failed`)
- Setelah selesai, refresh run history + panel watchlist otomatis
- Tampilkan flash message yang jelas saat sukses, gagal, atau timeout
- Tambahkan test kontrak UI untuk memastikan wiring polling dan refresh tetap terjaga
