-- ============================================================================
-- NOKARA – Noken & Karya Papua
-- 0001_schema.sql : tipe data, tabel, constraint, index
-- Jalankan berurutan: 0001 -> 0002 -> 0003 -> 0004 -> 0005
-- ============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------- ENUM -------------------------------------------------------------
create type public.user_role         as enum ('buyer', 'seller', 'admin');
create type public.store_status      as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.product_status    as enum ('active', 'inactive');
create type public.moderation_status as enum ('approved', 'blocked');
create type public.payment_method    as enum ('bank_transfer', 'e_wallet', 'cod');
create type public.payment_status    as enum ('pending', 'paid', 'failed');
create type public.order_status      as enum ('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled');
create type public.commission_status as enum ('pending', 'earned', 'cancelled');

-- ---------- PENGATURAN SISTEM (satu baris) -----------------------------------
create table public.app_settings (
  id                boolean primary key default true check (id),
  commission_rate   numeric(5,2)  not null default 5.00  check (commission_rate >= 0 and commission_rate <= 100),
  shipping_flat_fee numeric(14,2) not null default 20000 check (shipping_flat_fee >= 0),
  contact_email     text not null default 'halo@nokara.example',
  contact_phone     text not null default '',
  contact_address   text not null default 'Jayapura, Papua',
  updated_at        timestamptz not null default now()
);
insert into public.app_settings (id) values (true);

-- ---------- 1. PROFILES ------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '' check (char_length(full_name) <= 120),
  phone      text check (phone is null or char_length(phone) <= 20),
  avatar_url text,
  role       public.user_role not null default 'buyer',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx  on public.profiles (role);
create index profiles_email_idx on public.profiles (lower(email));

-- ---------- 2. STORES --------------------------------------------------------
create table public.stores (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references public.profiles (id) on delete restrict,
  name             text not null check (char_length(trim(name)) between 3 and 80),
  description      text not null default '' check (char_length(description) <= 2000),
  address          text not null default '' check (char_length(address) <= 300),
  city             text not null default '' check (char_length(city) <= 80),
  region           text not null default '' check (char_length(region) <= 80),
  phone            text not null default '' check (char_length(phone) <= 20),
  email            text not null default '' check (char_length(email) <= 120),
  image_url        text,
  status           public.store_status not null default 'pending',
  rejection_reason text,
  verified_at      timestamptz,
  verified_by      uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index stores_name_unique_idx on public.stores (lower(trim(name)));
create index stores_status_idx on public.stores (status);

-- ---------- 3. CATEGORIES ----------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories (id) on delete restrict,
  name        text not null check (char_length(trim(name)) between 2 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index categories_parent_idx on public.categories (parent_id);

-- ---------- 4. PRODUCTS ------------------------------------------------------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores (id) on delete restrict,
  category_id       uuid not null references public.categories (id) on delete restrict,
  name              text not null check (char_length(trim(name)) between 3 and 120),
  description       text not null default '' check (char_length(description) <= 5000),
  price             numeric(14,2) not null check (price > 0 and price <= 1000000000),
  stock             integer not null default 0 check (stock >= 0 and stock <= 100000),
  origin_region     text check (origin_region is null or char_length(origin_region) <= 80),
  status            public.product_status not null default 'active',
  moderation_status public.moderation_status not null default 'approved',
  moderation_note   text,
  sold_count        integer not null default 0 check (sold_count >= 0),
  rating_avg        numeric(3,2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count      integer not null default 0 check (rating_count >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_store_idx    on public.products (store_id);
create index products_category_idx on public.products (category_id);
create index products_visible_idx  on public.products (status, moderation_status);
create index products_price_idx    on public.products (price);
create index products_created_idx  on public.products (created_at desc);
create index products_sold_idx     on public.products (sold_count desc);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

-- ---------- 5. PRODUCT IMAGES ------------------------------------------------
create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  url          text not null,
  storage_path text,
  sort_order   integer not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, is_primary desc, sort_order);

-- ---------- 6. ADDRESSES -----------------------------------------------------
create table public.addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  label          text not null default 'Rumah' check (char_length(label) <= 40),
  recipient_name text not null check (char_length(trim(recipient_name)) between 2 and 120),
  phone          text not null check (phone ~ '^[0-9+][0-9 -]{7,18}$'),
  address_line   text not null check (char_length(trim(address_line)) between 5 and 300),
  city           text not null check (char_length(trim(city)) between 2 and 80),
  province       text not null check (char_length(trim(province)) between 2 and 80),
  postal_code    text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ---------- 7. CARTS / 8. CART ITEMS ----------------------------------------
create table public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null check (quantity > 0 and quantity <= 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);
create index cart_items_product_idx on public.cart_items (product_id);

-- ---------- 9. ORDERS (transaksi utama) --------------------------------------
create sequence public.order_number_seq;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  buyer_id         uuid not null references public.profiles (id) on delete restrict,
  payment_method   public.payment_method not null,
  payment_status   public.payment_status not null default 'pending',
  status           public.order_status not null default 'pending_payment',
  items_subtotal   numeric(14,2) not null check (items_subtotal >= 0),
  shipping_total   numeric(14,2) not null default 0 check (shipping_total >= 0),
  grand_total      numeric(14,2) not null check (grand_total >= 0),
  commission_total numeric(14,2) not null default 0 check (commission_total >= 0),
  notes            text check (notes is null or char_length(notes) <= 500),
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (grand_total = items_subtotal + shipping_total)
);
create index orders_buyer_idx   on public.orders (buyer_id, created_at desc);
create index orders_status_idx  on public.orders (status);
create index orders_paid_at_idx on public.orders (paid_at);

-- ---------- 9b. STORE ORDERS (pesanan per toko / child order) ----------------
-- Alamat kirim dan nama toko disalin (snapshot) ke sini dengan sengaja supaya
-- penjual tidak perlu membaca baris transaksi utama yang memuat total toko lain.
create table public.store_orders (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  store_id           uuid not null references public.stores (id) on delete restrict,
  buyer_id           uuid not null references public.profiles (id) on delete restrict,
  store_order_number text not null unique,
  store_name         text not null,
  status             public.order_status not null default 'pending_payment',
  items_subtotal     numeric(14,2) not null check (items_subtotal >= 0),
  shipping_fee       numeric(14,2) not null default 0 check (shipping_fee >= 0),
  total              numeric(14,2) not null check (total >= 0),
  commission_rate    numeric(5,2)  not null check (commission_rate >= 0 and commission_rate <= 100),
  commission_amount  numeric(14,2) not null check (commission_amount >= 0),
  seller_net         numeric(14,2) not null check (seller_net >= 0),
  shipping_name      text not null,
  shipping_phone     text not null,
  shipping_address   text not null,
  tracking_number    text check (tracking_number is null or char_length(tracking_number) <= 60),
  paid_at            timestamptz,
  processed_at       timestamptz,
  shipped_at         timestamptz,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (order_id, store_id),
  check (total = items_subtotal + shipping_fee),
  check (seller_net = items_subtotal - commission_amount)
);
create index store_orders_store_idx on public.store_orders (store_id, created_at desc);
create index store_orders_buyer_idx on public.store_orders (buyer_id);
create index store_orders_status_idx on public.store_orders (status);
create index store_orders_paid_at_idx on public.store_orders (paid_at);

-- ---------- 10. ORDER ITEMS (snapshot produk & harga) ------------------------
create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  store_order_id uuid not null references public.store_orders (id) on delete cascade,
  store_id       uuid not null references public.stores (id) on delete restrict,
  product_id     uuid references public.products (id) on delete set null,
  product_name   text not null,
  product_image  text,
  unit_price     numeric(14,2) not null check (unit_price > 0),
  quantity       integer not null check (quantity > 0),
  subtotal       numeric(14,2) not null,
  created_at     timestamptz not null default now(),
  check (subtotal = unit_price * quantity)
);
create index order_items_order_idx       on public.order_items (order_id);
create index order_items_store_order_idx on public.order_items (store_order_id);
create index order_items_product_idx     on public.order_items (product_id);
create index order_items_store_idx       on public.order_items (store_id);

-- ---------- 11. PAYMENTS -----------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null unique references public.orders (id) on delete cascade,
  transaction_number text not null unique,
  method             public.payment_method not null,
  amount             numeric(14,2) not null check (amount >= 0),
  status             public.payment_status not null default 'pending',
  paid_at            timestamptz,
  failed_at          timestamptz,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index payments_status_idx on public.payments (status);

-- ---------- 12. COMMISSIONS --------------------------------------------------
create table public.commissions (
  id             uuid primary key default gen_random_uuid(),
  store_order_id uuid not null unique references public.store_orders (id) on delete cascade,
  order_id       uuid not null references public.orders (id) on delete cascade,
  store_id       uuid not null references public.stores (id) on delete restrict,
  base_amount    numeric(14,2) not null check (base_amount >= 0),
  rate           numeric(5,2)  not null check (rate >= 0 and rate <= 100),
  amount         numeric(14,2) not null check (amount >= 0),
  seller_net     numeric(14,2) not null check (seller_net >= 0),
  status         public.commission_status not null default 'pending',
  earned_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (seller_net = base_amount - amount)
);
create index commissions_store_idx  on public.commissions (store_id);
create index commissions_order_idx  on public.commissions (order_id);
create index commissions_status_idx on public.commissions (status, earned_at);

-- ---------- Riwayat perubahan status ----------------------------------------
create table public.order_status_history (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  store_order_id uuid references public.store_orders (id) on delete cascade,
  scope          text not null check (scope in ('order', 'payment', 'store_order')),
  from_status    text,
  to_status      text not null,
  changed_by     uuid references public.profiles (id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);
create index order_status_history_store_order_idx on public.order_status_history (store_order_id);

-- ---------- 13. REVIEWS ------------------------------------------------------
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  store_id      uuid not null references public.stores (id) on delete cascade,
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  buyer_id      uuid not null references public.profiles (id) on delete cascade,
  buyer_name    text not null,
  rating        smallint not null check (rating between 1 and 5),
  comment       text not null default '' check (char_length(comment) <= 1000),
  created_at    timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id, created_at desc);
create index reviews_buyer_idx   on public.reviews (buyer_id);
create index reviews_store_idx   on public.reviews (store_id);

-- ---------- 14. NOTIFICATIONS ------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  message    text not null default '',
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ---------- 15. ACTIVITY LOGS ------------------------------------------------
create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_email text,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_actor_idx   on public.activity_logs (actor_id);
