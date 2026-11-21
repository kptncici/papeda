import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Compass, HandHeart, ShieldCheck, ShoppingBag, Sparkles, Store, Truck } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { searchProducts, listCategories, listStores } from '../../services/catalog';
import { ProductTileGrid } from '../../components/ProductCard';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { imageOf, rupiah } from '../../utils/format';

async function loadHome() {
  const [latest, best, categories, stores] = await Promise.all([
    searchProducts({ sort: 'newest', pageSize: 8 }),
    searchProducts({ sort: 'bestseller', pageSize: 4 }),
    listCategories(),
    listStores(6),
  ]);
  return {
    latest: latest.items,
    best: best.items.filter((p) => p.sold_count > 0),
    categories: categories.filter((c) => !c.parent_id),
    stores,
  };
}

/** Link teks bergaris bawah — pengganti tombol di layout editorial. */
function TextLink({ to, children, light = false }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 border-b pb-1 text-xs font-semibold uppercase tracking-eyebrow transition-opacity hover:opacity-60 ${
        light ? 'border-cream-100 text-cream-100' : 'border-charcoal text-charcoal'
      }`}
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
    </Link>
  );
}

function SectionHead({ eyebrow, title, accent, to, linkLabel }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-cream-300 pb-4 md:mb-12 md:pb-5">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-1.5 font-display text-2xl font-light tracking-tight text-charcoal sm:text-4xl">
          {title}{' '}
          {accent && <span className="font-display font-normal text-charcoal">{accent}</span>}
        </h2>
      </div>
      {to && <TextLink to={to}>{linkLabel}</TextLink>}
    </div>
  );
}

/**
 * Hero Lookbook:
 * - Mobile & Tablet (< lg): Layout Compact & Proporsional (Grid 2 kolom di tablet, kartu kompak di mobile).
 * - PC/Laptop (lg+): 3-Kolom (Sisi Kiri Headline — Tengah Foto Potret 3:4 — Sisi Kanan Narasi & CTA).
 */
function Hero({ product }) {
  return (
    <section className="border-b border-cream-300 bg-cream-100">
      <div className="container-page py-6 sm:py-10 lg:py-20">
        {/* TAMPILAN COMPACT KHUSUS MOBILE & TABLET (< lg) */}
        <div className="grid items-center gap-6 md:grid-cols-12 lg:hidden">
          <div className="md:col-span-5">
            {product ? (
              <Link
                to={`/produk/${product.id}`}
                className="group relative mx-auto block aspect-[4/5] max-w-xs overflow-hidden border border-cream-300 bg-cream-200 md:aspect-[3/4] md:max-w-none"
              >
                <img
                  src={imageOf(product.image_url)}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 border border-cream-200/60 bg-charcoal/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-cream-100 backdrop-blur-[2px]">
                  100% Autentik
                </span>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-charcoal/80 via-charcoal/30 to-transparent p-4 text-cream-100">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-eyebrow text-cream-200">
                      {product.store_name || "Karya Pilihan"}
                    </p>
                    <p className="truncate font-display text-sm font-semibold">
                      {product.name}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-cream-100">
                    {rupiah(product.price)}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex aspect-[4/5] w-full flex-col items-center justify-center border border-cream-300 bg-cream-200 p-6 text-center">
                <Store
                  className="h-8 w-8 text-charcoal-400"
                  strokeWidth={1.25}
                />
                <p className="mt-2 text-xs uppercase tracking-eyebrow text-charcoal-500">
                  Koleksi Segera Hadir
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 md:col-span-7 md:pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow">Edisi Kurasi — Papua</p>
              <span className="text-[11px] font-medium text-charcoal-500">
                {product?.origin_region || product?.store_city || "Tanah Papua"}
              </span>
            </div>

            <h1 className="font-display text-3xl font-light leading-[1.08] tracking-tight text-charcoal sm:text-4xl">
              Dianyam dengan{" "}
              <span className="font-display text-[1.04em] font-normal text-charcoal">
                tangan.
              </span>
            </h1>

            <p className="text-xs leading-relaxed text-charcoal-600 sm:text-sm">
              Setiap serat kayu, pintalan benang, dan motif ukiran menyimpan
              jejak tradisi pengrajin Papua—dikurasi langsung dari komunitas
              lokal untuk keseharian modern.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link to="/produk" className="btn btn-primary">
                Belanja Koleksi
              </Link>
              <TextLink to="/tentang">Cerita kami</TextLink>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-cream-300 pt-3">
              <div>
                <p className="font-display text-sm font-bold uppercase tracking-wider text-charcoal">
                  Kurasi
                </p>
                <p className="text-[11px] text-charcoal-500">
                  Pengrajin Terverifikasi
                </p>
              </div>
              <div>
                <p className="font-display text-sm font-bold uppercase tracking-wider text-charcoal">
                  Langsung
                </p>
                <p className="text-[11px] text-charcoal-500">
                  Dari Tangan Pembuat
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TAMPILAN 3-KOLOM KHUSUS PC / LAPTOP (lg+) */}
        <div className="hidden items-center gap-10 lg:grid lg:grid-cols-[1fr_minmax(340px,430px)_1fr] xl:gap-14">
          {/* Sisi Kiri: Identitas & Headline Utama */}
          <div className="flex flex-col justify-between space-y-6 lg:min-h-[500px] lg:py-4">
            <div>
              <p className="eyebrow">Edisi Kurasi — Papua</p>
              <p className="mt-1 text-xs font-medium text-charcoal-400">
                Lookbook Koleksi Pengrajin
              </p>
            </div>

            <div>
              <h1 className="font-display text-5xl font-light leading-[1.04] tracking-tight text-charcoal xl:text-6xl">
                Dianyam <br />
                dengan <br />
                <span className="font-display text-[1.04em] font-normal text-charcoal">
                  tangan.
                </span>
              </h1>
              <div className="mt-6 h-px w-16 bg-charcoal" />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-charcoal-400">
                Asal Karya
              </p>
              <p className="mt-1 text-xs font-bold text-charcoal">
                {product?.origin_region ||
                  product?.store_city ||
                  "Pegunungan & Pesisir Papua"}
              </p>
            </div>
          </div>

          {/* Tengah: Foto Lookbook Potret 3:4 */}
          <div className="w-full">
            {product ? (
              <Link
                to={`/produk/${product.id}`}
                className="group relative block aspect-[3/4] w-full overflow-hidden border border-cream-300 bg-cream-200"
              >
                <img
                  src={imageOf(product.image_url)}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-charcoal/75 via-charcoal/25 to-transparent p-5 text-cream-100">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-eyebrow text-cream-200">
                      {product.store_name || "Karya Pilihan"}
                    </p>
                    <p className="mt-0.5 truncate font-display text-sm font-semibold">
                      {product.name}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-cream-100">
                    {rupiah(product.price)}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex aspect-[3/4] w-full flex-col items-center justify-center border border-cream-300 bg-cream-200 p-8 text-center">
                <Store
                  className="h-10 w-10 text-charcoal-400"
                  strokeWidth={1.25}
                />
                <p className="mt-3 text-xs uppercase tracking-eyebrow text-charcoal-500">
                  Koleksi Segera Hadir
                </p>
              </div>
            )}
          </div>

          {/* Sisi Kanan: Filosofi, Narasi & Navigasi Aksi */}
          <div className="flex flex-col justify-between space-y-6 lg:min-h-[500px] lg:py-4 lg:text-right">
            <div>
              <span className="inline-block border border-cream-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-eyebrow text-earth-600">
                100% Karya Autentik
              </span>
            </div>

            <div className="lg:ml-auto lg:max-w-xs">
              <p className="eyebrow">Filosofi Karya</p>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-600">
                Setiap serat kayu, pintalan benang, dan motif ukiran menyimpan
                jejak tradisi pengrajin Papua—dikurasi langsung dari komunitas
                lokal untuk keseharian modern.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6 lg:justify-end">
                <Link to="/produk" className="btn btn-primary">
                  Belanja Koleksi
                </Link>
                <TextLink to="/tentang">Cerita kami</TextLink>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-cream-300 pt-5 text-left lg:text-right">
              <div>
                <p className="font-display text-xl font-bold text-charcoal">
                  Kurasi
                </p>
                <p className="mt-0.5 text-[11px] text-charcoal-500">
                  Pengrajin Terverifikasi
                </p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-charcoal">
                  Langsung
                </p>
                <p className="mt-0.5 text-[11px] text-charcoal-500">
                  Dari Tangan Pembuat
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Tiga panel editorial berdampingan (compact horizontal/grid di mobile & tablet). */
function Editorial({ products }) {
  if (products.length === 0) return null;
  const shown = products.slice(0, 3);
  return (
    <section className="border-b border-cream-300 bg-cream-100">
      <div className="container-page py-10 md:py-16 lg:py-20">
        <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
          <div>
            <p className="eyebrow">Sorotan Lookbook</p>
            <h2 className="mt-1 font-display text-2xl font-light tracking-tight text-charcoal sm:text-3xl">
              Tiga Karya <span className="font-serif text-[1.08em] font-normal italic text-charcoal">Pilihan</span>
            </h2>
          </div>
          <span className="text-xs font-medium uppercase tracking-eyebrow text-charcoal-400">01 / 03</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
          {shown.map((product, index) => (
            <Link
              key={product.id}
              to={`/produk/${product.id}`}
              className="group relative block aspect-[4/3] overflow-hidden border border-cream-300 bg-cream-200 sm:aspect-[3/4]"
            >
              <img
                src={imageOf(product.image_url)}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/15 to-transparent" aria-hidden="true" />
              <span className="absolute left-3.5 top-3.5 border border-cream-100/40 bg-charcoal/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow text-cream-100 backdrop-blur-[2px]">
                0{index + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4 text-cream-100 sm:p-5">
                <p className="text-[10px] uppercase tracking-eyebrow text-cream-200">
                  {product.category_name || product.store_name || 'Karya Pilihan'}
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <p className="truncate font-display text-base font-semibold md:text-lg">{product.name}</p>
                  <p className="shrink-0 text-xs font-bold text-cream-200">{rupiah(product.price)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const PROMISES = [
  {
    icon: HandHeart,
    num: '01',
    title: 'Dibuat dengan tangan',
    text: 'Setiap toko dikelola langsung oleh pengrajin atau UMKM lokal Papua yang telah melalui proses verifikasi kurasi admin.',
  },
  {
    icon: ShoppingBag,
    num: '02',
    title: 'Banyak toko, satu keranjang',
    text: 'Belanja berbagai karya dari beberapa pengrajin sekaligus dalam satu pembayaran; pengiriman dipisah per toko secara otomatis.',
  },
  {
    icon: ShieldCheck,
    num: '03',
    title: 'Harga dan stok terjamin',
    text: 'Transparansi penuh untuk pembeli dan pengrajin. Harga serta ketersediaan stok divalidasi ulang di server sebelum pesanan diproses.',
  },
  {
    icon: Compass,
    num: '04',
    title: 'Jejak daerah asal jelas',
    text: 'Setiap karya mencantumkan asal daerah atau kota pengrajin di Tanah Papua untuk menghargai keaslian budaya setempat.',
  },
  {
    icon: Sparkles,
    num: '05',
    title: 'Pemberdayaan pengrajin',
    text: 'Pendapatan bersih tercatat transparan langsung ke akun pengrajin, membantu pertumbuhan ekonomi kreatif lokal.',
  },
  {
    icon: Truck,
    num: '06',
    title: 'Lacak tiap paket toko',
    text: 'Status pengiriman dan nomor resi diperbarui langsung dari masing-masing bengkel pengrajin hingga tiba di tangan Anda.',
  },
];

/** Section Standar Kurasi dengan 6 kartu yang berjalan looping terus-menerus ke arah kanan. */
function PromisesMarquee() {
  const loopItems = [...PROMISES, ...PROMISES];

  return (
    <section className="overflow-hidden border-t border-cream-300 bg-cream-100 py-14 md:py-24">
      <div className="container-page mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Standar Kurasi</p>
          <h2 className="mt-1.5 font-display text-2xl font-light tracking-tight text-charcoal sm:text-4xl">
            Komitmen pada{' '}
            <span className="font-serif text-[1.08em] font-normal italic text-charcoal">keaslian &amp; kualitas</span>
          </h2>
        </div>
        <p className="text-xs font-medium uppercase tracking-eyebrow text-charcoal-400">
          01 — 06 Prinsip PAPEDA
        </p>
      </div>

      <div className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-cream-100 to-transparent sm:w-24" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-cream-100 to-transparent sm:w-24" aria-hidden="true" />

        <motion.div
          className="flex w-max gap-5 px-3"
          animate={{ x: ['-50%', '0%'] }}
          transition={{ duration: 42, ease: 'linear', repeat: Infinity }}
        >
          {loopItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.num}-${idx}`}
                className="card flex w-[280px] shrink-0 flex-col justify-between p-6 transition-colors hover:border-charcoal sm:w-[350px] sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 border-b border-cream-200 pb-4">
                    <span className="flex h-10 w-10 items-center justify-center border border-cream-300 bg-cream-50 text-earth-500">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <span className="font-display text-xs font-bold uppercase tracking-eyebrow text-charcoal-400">
                      {item.num}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-sm font-bold uppercase tracking-wider text-charcoal sm:text-base">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-charcoal-600 sm:text-sm">
                    {item.text}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const state = useAsync(loadHome, []);
  return (
    <DataState state={state}>
      {({ latest, best, categories, stores }) => (
        <>
          <Hero product={latest[0]} />
          <Editorial products={latest.slice(1, 4).length >= 3 ? latest.slice(1, 4) : latest.slice(0, 3)} />

          <section className="container-page py-14 md:py-24">
            <SectionHead eyebrow="Rilis Baru" title="Karya" accent="terbaru" to="/produk" linkLabel="Lihat semua koleksi" />
            {latest.length ? (
              <ProductTileGrid products={latest} />
            ) : (
              <EmptyState
                icon={Store}
                title="Belum ada produk"
                description="Produk akan muncul di sini setelah toko pengrajin disetujui admin dan mulai berjualan."
                action={<Link to="/daftar?peran=seller" className="btn btn-primary">Daftar sebagai penjual</Link>}
              />
            )}
          </section>

          {categories.length > 0 && (
            <section className="border-y border-cream-300 bg-white">
              <div className="container-page py-12 md:py-20">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <p className="eyebrow">Indeks Kategori</p>
                  <TextLink to="/kategori">Semua kategori</TextLink>
                </div>
                <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 md:mt-8 md:gap-x-12 md:gap-y-4">
                  {categories.map((category, idx) => (
                    <li key={category.id}>
                      <Link
                        to={`/kategori/${category.slug}`}
                        className="group inline-flex items-baseline gap-2 font-display text-2xl font-bold tracking-tight text-charcoal transition-opacity hover:opacity-60 sm:text-3xl md:text-5xl"
                      >
                        <span className="font-display text-base font-bold text-charcoal-400">
                          0{idx + 1}
                        </span>
                        <span>{category.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {best.length > 0 && (
            <section className="container-page py-14 md:py-24">
              <SectionHead eyebrow="Kurasi Terpopuler" title="Paling banyak" accent="diminati" to="/produk?urut=bestseller" linkLabel="Lihat terlaris" />
              <ProductTileGrid products={best} />
            </section>
          )}

          {stores.length > 0 && (
            <section className="border-y border-cream-300 bg-cream-200/70">
              <div className="container-page py-14 md:py-24">
                <SectionHead eyebrow="Komunitas Pengrajin" title="Toko di balik" accent="setiap karya" />
                <ul className="divide-y divide-cream-300 border-y border-cream-300">
                  {stores.map((store) => (
                    <li key={store.id}>
                      <Link to={`/toko/${store.id}`} className="group flex items-center justify-between gap-6 px-2 py-4 transition-colors hover:bg-cream-100/60 sm:py-5">
                        <span className="flex min-w-0 items-center gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-cream-300 bg-cream-100 text-charcoal-400">
                            {store.image_url ? (
                              <img src={store.image_url} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <Store className="h-5 w-5" strokeWidth={1.5} />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-display text-base font-bold text-charcoal group-hover:underline group-hover:underline-offset-4 sm:text-lg">
                              {store.name}
                            </span>
                            <span className="block truncate text-xs text-charcoal-500">
                              {[store.city, store.region].filter(Boolean).join(', ') || 'Papua'}
                            </span>
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-eyebrow text-charcoal-600 group-hover:text-charcoal">
                          Kunjungi<ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <PromisesMarquee />
        </>
      )}
    </DataState>
  );
}
