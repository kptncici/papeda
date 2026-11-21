-- ============================================================================
-- NOKARA – 0005_default_categories.sql : kategori bawaan (aman dijalankan ulang)
-- ============================================================================
insert into public.categories (name, slug, description, sort_order) values
  ('Noken Papua',           'noken-papua',      'Tas rajut dan anyaman khas Papua dalam berbagai bahan dan ukuran.', 1),
  ('Aksesoris Papua',       'aksesoris-papua',  'Kalung, gelang, anting, dan aksesoris buatan tangan.', 2),
  ('Ukiran dan Seni Papua', 'ukiran-seni-papua','Ukiran kayu, patung, dan karya seni dekoratif.', 3),
  ('Kerajinan Tangan',      'kerajinan-tangan', 'Anyaman, kerajinan bahan alam, dan produk handmade.', 4),
  ('Souvenir Papua',        'souvenir-papua',   'Cendera mata dan hiasan rumah khas Papua.', 5)
on conflict (slug) do nothing;

insert into public.categories (parent_id, name, slug, sort_order)
select p.id, v.name, v.slug, v.sort_order
from (values
  ('noken-papua', 'Noken Rajut', 'noken-rajut', 1),
  ('noken-papua', 'Noken Kulit Kayu', 'noken-kulit-kayu', 2),
  ('noken-papua', 'Noken Tradisional', 'noken-tradisional', 3),
  ('noken-papua', 'Noken Modern', 'noken-modern', 4),
  ('aksesoris-papua', 'Kalung', 'kalung', 1),
  ('aksesoris-papua', 'Gelang', 'gelang', 2),
  ('aksesoris-papua', 'Anting', 'anting', 3),
  ('aksesoris-papua', 'Aksesoris Tradisional', 'aksesoris-tradisional', 4),
  ('ukiran-seni-papua', 'Ukiran Kayu', 'ukiran-kayu', 1),
  ('ukiran-seni-papua', 'Patung', 'patung', 2),
  ('ukiran-seni-papua', 'Hiasan Seni', 'hiasan-seni', 3),
  ('ukiran-seni-papua', 'Kerajinan Dekoratif', 'kerajinan-dekoratif', 4),
  ('kerajinan-tangan', 'Kerajinan Anyaman', 'kerajinan-anyaman', 1),
  ('kerajinan-tangan', 'Kerajinan Bahan Alam', 'kerajinan-bahan-alam', 2),
  ('kerajinan-tangan', 'Produk Handmade', 'produk-handmade', 3),
  ('souvenir-papua', 'Cendera Mata', 'cendera-mata', 1),
  ('souvenir-papua', 'Hiasan Rumah', 'hiasan-rumah', 2),
  ('souvenir-papua', 'Produk Khas Papua', 'produk-khas-papua', 3)
) as v(parent_slug, name, slug, sort_order)
join public.categories p on p.slug = v.parent_slug
on conflict (slug) do nothing;
