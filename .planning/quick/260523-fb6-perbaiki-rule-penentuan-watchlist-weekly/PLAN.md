---
quick_id: 260523-fb6
status: in_progress
created: 2026-05-23
---

# Quick Plan

Perbaiki rule penentuan watchlist weekly agar fokus ke potensi naik 1 minggu+:
- Analisis tetap dijalankan ke seluruh 45 simbol universe sebelum ranking
- Ganti scoring liquidity-heavy menjadi hybrid trend-first
- Tambahkan gate `trend_candidate`, `reversal_candidate`, `reject`
- Reversal harus lolos konfirmasi anti fake breakout
- Simpan status/rule outcome ke `score_detail` untuk audit UI
- Tambahkan unit test sintetis untuk trend-vs-liquidity behavior
