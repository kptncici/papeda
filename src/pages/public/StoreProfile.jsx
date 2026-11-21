import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Mail, MapPin, MessageCircle, Package, PackageOpen, ShoppingBag, Star, Store } from 'lucide-react';
import { supabase, unwrap } from '../../lib/supabase';
import { useAsync } from '../../hooks/useAsync';
import { getStore, searchProducts, PAGE_SIZE } from '../../services/catalog';
import { ProductGrid } from '../../components/ProductCard';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Layout';
import { angka, tanggal } from '../../utils/format';

/** Angka ringkasan toko, dihitung dari tabel reviews dan products (bukan angka statis). */
async function getStoreStats(storeId) {
  const [reviews, products] = await Promise.all([
    supabase.from('reviews').select('rating').eq('store_id', storeId).then(unwrap),
    supabase.from('products').select('sold_count').eq('store_id', storeId).eq('status', 'active').eq('moderation_status', 'approved').then(unwrap),
  ]);
  const ratingCount = reviews.length;
  return {
    ratingCount,
    ratingAvg: ratingCount ? reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount : 0,
    sold: products.reduce((sum, product) => sum + product.sold_count, 0),
  };
}

function joinedAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 1) return 'Hari ini';
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

/** 0812xxxx -> 62812xxxx untuk tautan wa.me; null bila nomornya tidak masuk akal. */
function whatsappLink(phone, storeName) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Halo ${storeName}, saya melihat toko Anda di PAPEDA.`)}`;
}

function Stat({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="h-[18px] w-[18px] shrink-0 text-charcoal-600" strokeWidth={1.75} />
      <dt className="text-charcoal-600">{label}:</dt>
      <dd className="min-w-0 truncate font-semibold text-charcoal">{children}</dd>
    </div>
  );
}

function StoreHeader({ store, stats, productTotal }) {
  const location = [store.city, store.region].filter(Boolean).join(', ');
  const wa = whatsappLink(store.phone, store.name);
  const buttonClass = 'flex flex-1 items-center justify-center gap-2 rounded-md border border-white/70 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/15';

  return (
    <header className="rounded-lg border border-cream-300 bg-white p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[390px_1fr] lg:items-center">
        <div className="rounded-lg bg-charcoal p-4 text-white">
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/30 bg-white text-charcoal">
              {store.image_url ? <img src={store.image_url} alt={`Logo ${store.name}`} className="h-full w-full object-contain" /> : <Store className="h-8 w-8" />}
            </span>
            <div className="min-w-0">
              <h1 className="break-words font-display text-xl font-semibold leading-tight">{store.name}</h1>
              <p className="mt-1 text-sm text-cream-200">{location || 'Papua'}</p>
              <p className="mt-0.5 text-xs text-cream-300">Toko terverifikasi PAPEDA</p>
            </div>
          </div>
          {(wa || store.email) && (
            <div className="mt-4 flex gap-2">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass}><MessageCircle className="h-4 w-4" />Chat WhatsApp</a>}
              {store.email && <a href={`mailto:${store.email}`} className={buttonClass}><Mail className="h-4 w-4" />Email</a>}
            </div>
          )}
        </div>

        <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          <Stat icon={Package} label="Produk">{angka(productTotal)}</Stat>
          <Stat icon={Star} label="Penilaian">
            {stats.ratingCount ? `${stats.ratingAvg.toFixed(1)} (${angka(stats.ratingCount)} penilaian)` : 'Belum ada'}
          </Stat>
          <Stat icon={ShoppingBag} label="Produk terjual">{angka(stats.sold)}</Stat>
          <Stat icon={CalendarDays} label="Bergabung"><span title={tanggal(store.created_at)}>{joinedAgo(store.created_at)}</span></Stat>
          <Stat icon={MapPin} label="Lokasi">{location || '-'}</Stat>
        </dl>
      </div>

      <div className="mt-6 border-t border-cream-200 pt-5">
        <h2 className="font-display text-base font-semibold">Tentang toko</h2>
        <p className="mt-1.5 max-w-3xl whitespace-pre-line text-sm leading-6 text-charcoal-600">{store.description || 'Toko ini belum menulis deskripsi.'}</p>
        {store.address && (
          <p className="mt-3 flex items-start gap-2 text-sm text-charcoal-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-earth-500" />{[store.address, store.city, store.region].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    </header>
  );
}

export default function StoreProfile() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const state = useAsync(async () => {
    const store = await getStore(id);
    if (!store) return { store: null };
    const [products, stats] = await Promise.all([searchProducts({ storeId: id, page }), getStoreStats(id)]);
    return { store, products, stats };
  }, [id, page]);

  return (
    <div className="container-page py-8">
      <DataState state={state}>
        {({ store, products, stats }) => !store ? (
          <EmptyState icon={Store} title="Toko tidak ditemukan" description="Toko ini belum aktif atau sudah tidak tersedia."
            action={<Link to="/produk" className="btn btn-primary">Lihat semua produk</Link>} />
        ) : (
          <>
            <StoreHeader store={store} stats={stats} productTotal={products.total} />
            <h2 className="mb-4 mt-8 text-2xl font-semibold">Produk toko ini ({products.total})</h2>
            {products.items.length === 0
              ? <EmptyState icon={PackageOpen} title="Belum ada produk" description="Toko ini belum menayangkan produk." />
              : <>
                  <ProductGrid products={products.items} />
                  <Pagination page={page} pageSize={PAGE_SIZE} total={products.total} onChange={setPage} />
                </>}
          </>
        )}
      </DataState>
    </div>
  );
}