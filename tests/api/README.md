# Uji lapisan service

Menjalankan fungsi di `src/services/` terhadap PostgREST lokal dengan RLS aktif, tanpa proyek Supabase.

Syarat: PostgreSQL lokal (pengguna saat ini superuser), Node 20+, dan biner PostgREST dari <https://github.com/PostgREST/postgrest/releases>.

```bash
POSTGREST_BIN=/path/ke/postgrest bash tests/api/setup_local_api.sh
node tests/api/run.mjs
```

`setup_local_api.sh` membuat ulang database `nokara_api`, menjalankan migrasi dan seed, lalu menyalakan PostgREST (port 3001) dan proxy `/rest/v1` (port 54321). Jalankan ulang skrip itu sebelum setiap `run.mjs` karena uji mengubah data.

Tidak tercakup: Supabase Auth, Storage, dan Edge Functions.
