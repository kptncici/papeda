#!/usr/bin/env bash
# Menyiapkan API lokal untuk menguji lapisan service frontend tanpa proyek Supabase:
#   PostgreSQL lokal (stub auth/storage) + PostgREST + proxy /rest/v1.
# Syarat: psql, createdb, node >= 20, dan biner `postgrest` (https://github.com/PostgREST/postgrest/releases).
# Pakai:  POSTGREST_BIN=/path/ke/postgrest bash tests/api/setup_local_api.sh   lalu   node tests/api/run.mjs
set -eu
cd "$(dirname "$0")/../.."
DB=nokara_api
SECRET="nokara-local-test-secret-jangan-dipakai-di-produksi"
PGRST="${POSTGREST_BIN:-postgrest}"

dropdb --if-exists "$DB"; createdb "$DB"
for f in supabase/tests/00_local_stubs.sql supabase/migrations/*.sql; do psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login password 'authenticator';
  end if;
end $$;
grant anon, authenticated, service_role to authenticator;
insert into auth.users (email, raw_user_meta_data) values
  ('admin@nokara.test',    '{"full_name":"Admin Uji"}'),
  ('penjual1@nokara.test', '{"full_name":"Penjual Demo Satu","role":"seller"}'),
  ('penjual2@nokara.test', '{"full_name":"Penjual Demo Dua","role":"seller"}'),
  ('penjual3@nokara.test', '{"full_name":"Penjual Demo Tiga","role":"seller"}'),
  ('penjual4@nokara.test', '{"full_name":"Penjual Baru","role":"seller"}'),
  ('pembeli1@nokara.test', '{"full_name":"Pembeli Demo Satu"}'),
  ('pembeli2@nokara.test', '{"full_name":"Pembeli Demo Dua"}');
select public.promote_to_admin('admin@nokara.test');
SQL
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/seed.sql

cat > /tmp/nokara-postgrest.conf <<CONF
db-uri = "postgres://authenticator:authenticator@127.0.0.1:5432/$DB"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = 3001
CONF
pkill -f nokara-postgrest.conf 2>/dev/null || true
pkill -f tests/api/proxy.mjs 2>/dev/null || true
nohup "$PGRST" /tmp/nokara-postgrest.conf > /tmp/nokara-postgrest.log 2>&1 &
nohup node tests/api/proxy.mjs > /tmp/nokara-proxy.log 2>&1 &
sleep 2
echo "API lokal siap di http://127.0.0.1:54321/rest/v1"
