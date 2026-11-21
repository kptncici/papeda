import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ClipboardCheck, HandCoins, Landmark, PackageCheck, ShoppingBag, Store, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAsync } from '../../hooks/useAsync';
import { searchProducts, listCategories } from '../../services/catalog';
import { angka, imageOf } from '../../utils/format';

/** Memuat angka ringkas dan beberapa foto karya pengrajin untuk galeri editorial Tentang Kami. */
async function loadAboutData() {
  const [products, categories, stores] = await Promise.all([
    searchProducts({ sort: 'newest', pageSize: 4 }),
    listCategories(),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
  ]);
  return {
    figures: [
      { label: 'Toko pengrajin aktif', value: stores.count || 0 },
      { label: 'Karya tersedia', value: products.total || 0 },
      { label: 'Kategori utama', value: categories.filter((category) => !category.parent_id).length },
    ],
    photos: products.items || [],
  };
}

const STEPS = [
  {
    num: '01',
    phase: 'Pendaftaran',
    icon: UserPlus,
    title: 'Pengrajin mendaftar',
    text: 'Pengrajin atau UMKM Papua membuat akun penjual dan melengkapi profil toko beserta cerita karya mereka.',
  },
  {
    num: '02',
    phase: 'Produk Pilihan & Verifikasi',
    icon: ClipboardCheck,
    title: 'Admin memverifikasi',
    text: 'Tim admin memeriksa keaslian profil pengrajin. Hanya toko yang disetujui yang dapat menayangkan produk ke publik.',
  },
  {
    num: '03',
    phase: 'Transaksi Terpadu',
    icon: ShoppingBag,
    title: 'Pembeli berbelanja',
    text: 'Pembeli dapat memesan karya dari beberapa toko sekaligus dalam satu keranjang; sistem memisahkan paket per toko otomatis.',
  },
  {
    num: '04',
    phase: 'Pengiriman & Apresiasi',
    icon: PackageCheck,
    title: 'Kirim dan konfirmasi',
    text: 'Pengrajin mengirimkan pesanan dan memperbarui nomor resi. Setelah diterima, pembeli dapat memberikan ulasan.',
  },
];

const AUDIENCES = [
  {
    tag: '01 / Apresiator & Pembeli',
    icon: ShoppingBag,
    title: 'Untuk Pembeli',
    subtitle: 'Menemukan kriya autentik Papua langsung dari pembuatnya.',
    to: '/produk',
    cta: 'Eksplorasi Koleksi',
    points: [
      'Belanja dari banyak pengrajin sekaligus dalam satu proses checkout',
      'Harga dan ketersediaan stok divalidasi langsung di server secara real-time',
      'Transparansi pelacakan paket pengiriman dan nomor resi dari tiap toko',
    ],
  },
  {
    tag: '02 / Mitra Kreator Lokal',
    icon: Store,
    title: 'Untuk Pengrajin & UMKM',
    subtitle: 'Etalase digital mandiri untuk menjangkau pasar nasional.',
    to: '/daftar?peran=seller',
    cta: 'Buka Toko Pengrajin',
    points: [
      'Memiliki halaman profil toko resmi tanpa perlu membangun situs sendiri',
      'Kelola katalog karya, foto, harga, dan stok dari satu dasbor terpadu',
      'Rekap laporan penjualan dan perhitungan pendapatan bersih secara otomatis',
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

export default function About() {
  const state = useAsync(loadAboutData, []);
  const figures = state.data?.figures;
  const photos = state.data?.photos || [];

  return (
    <div className="overflow-hidden">
      {/* Hero Editorial dengan Space Foto Lookbook */}
      <section className="border-b border-cream-300 bg-cream-100">
        <div className="container-page py-12 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.p variants={fadeUp} className="eyebrow">
                Manifesto &amp; Cerita Kami
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="mt-3 font-display text-4xl font-light leading-[1.06] tracking-tight text-charcoal sm:text-5xl lg:text-6xl"
              >
                Satu ruang bagi{" "}
                <span className="font-serif text-[1.08em] font-medium italic underline decoration-[#3d352e88] decoration-2 underline-offset-4 text-charcoal">
                  Karya tangan Papua
                </span>{" "}
                dan sosok di baliknya.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-xl text-sm leading-relaxed text-charcoal-600 sm:text-base"
              >
                PAPEDA — singkatan dari{" "}
                <strong>Papua Aksesori &amp; Produk Etnik Daerah Asli</strong> —
                adalah ruang Produk Pilihan dan marketplace multi-vendor yang
                mempertemukan pengrajin noken, pengukir kayu, serta UMKM budaya
                Papua dengan apresiator di seluruh Indonesia.
              </motion.p>

              {figures && (
                <motion.dl
                  variants={fadeUp}
                  className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-cream-300 pt-6"
                >
                  {figures.map((figure) => (
                    <div key={figure.label}>
                      <dd className="font-display text-3xl font-light tracking-tight text-charcoal sm:text-4xl">
                        {angka(figure.value)}
                      </dd>
                      <dt className="mt-1 text-[11px] uppercase tracking-wider text-charcoal-500">
                        {figure.label}
                      </dt>
                    </div>
                  ))}
                </motion.dl>
              )}
            </motion.div>

            {/* Space Foto Utama & Kolase Editorial */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-12 gap-4"
            >
              <div className="col-span-7">
                <div className="aspect-[3/4] w-full overflow-hidden border border-cream-300 bg-cream-200">
                  <img
                    src={imageOf(photos[0]?.image_url)}
                    alt={photos[0]?.name || "Karya pengrajin Papua"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-eyebrow text-charcoal-400">
                  Fig. 01 — {photos[0]?.name || "Anyaman & Kriya Tangan"}
                </p>
              </div>
              <div className="col-span-5 flex flex-col justify-between gap-4 pt-8">
                <div>
                  <div className="aspect-[3/4] w-full overflow-hidden border border-cream-300 bg-cream-200">
                    <img
                      src={imageOf(
                        photos[1]?.image_url || photos[0]?.image_url,
                      )}
                      alt={photos[1]?.name || "Detail tekstur karya Papua"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-eyebrow text-charcoal-400">
                    Fig. 02 — {photos[1]?.origin_region || "Tradisi Lokal"}
                  </p>
                </div>
                <div className="border border-cream-300 bg-white p-4">
                  <p className="text-[10px] uppercase tracking-eyebrow text-earth-500">
                    Filosofi
                  </p>
                  <p className="mt-1 font-display text-xs leading-relaxed text-charcoal">
                    &ldquo;Connecting Papuan Crafts to the World.&rdquo;
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Siapa PAPEDA & Space Foto Dokumentasi */}
      <section className="border-b border-cream-300 bg-white">
        <div className="container-page py-16 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid gap-12 lg:grid-cols-12 lg:items-center"
          >
            {/* Space Foto Visual di Sisi Kiri */}
            <motion.div variants={fadeUp} className="lg:col-span-5">
              <div className="relative">
                <div className="aspect-[4/5] w-full overflow-hidden border border-cream-300 bg-cream-200">
                  <img
                    src={imageOf(photos[2]?.image_url || photos[0]?.image_url)}
                    alt="Karya pilihan PAPEDA"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between border-b border-cream-300 pb-3 text-[11px] uppercase tracking-eyebrow text-charcoal-500">
                  <span>Arsip Visual PAPEDA</span>
                  <span>Tanah Papua</span>
                </div>
              </div>
            </motion.div>

            {/* Narasi Siapa PAPEDA & Mengapa Dibuat di Sisi Kanan */}
            <motion.div variants={fadeUp} className="lg:col-span-7 lg:pl-6">
              <p className="eyebrow">01 / Siapa PAPEDA</p>
              <h2 className="mt-2 font-display text-3xl font-light tracking-tight text-charcoal sm:text-4xl">
                Jembatan antara{" "}
                <span className="font-serif text-[1.08em] font-medium italic underline decoration-[#3d352e5d] decoration-2 underline-offset-4 text-charcoal">
                  warisan budaya
                </span>{" "}
                dan ekosistem digital modern.
              </h2>
              <div className="mt-6 space-y-4 text-sm leading-relaxed text-charcoal-600 sm:text-base">
                <p>
                  Papua menyimpan kekayaan kriya yang tak ternilai—mulai dari
                  noken serat kayu yang diakui UNESCO sebagai warisan budaya
                  takbenda, hingga ukiran kayu, anyaman, dan aksesoris etnik.
                  Namun, banyak pengrajin lokal yang terkendala akses pemasaran
                  digital untuk menjangkau apresiator di luar daerahnya.
                </p>
                <p>
                  <strong>PAPEDA</strong> hadir sebagai rumah digital bersama.
                  Kami bukan sekadar katalog toko, melainkan ekosistem
                  terverifikasi di mana setiap pengrajin memiliki identitas toko
                  sendiri, mengatur stok dan harga secara mandiri, serta
                  terhubung langsung dengan pembeli di seluruh nusantara.
                </p>
              </div>

              <div className="mt-8 grid gap-4 border-t border-cream-300 pt-8 sm:grid-cols-2">
                <div className="border-l-2 border-charcoal pl-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-charcoal">
                    Produk Pilihan Terverifikasi
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal-500">
                    Setiap pengajuan toko ditinjau secara manual oleh admin
                    untuk menjaga keaslian komunitas pengrajin.
                  </p>
                </div>
                <div className="border-l-2 border-earth-500 pl-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-charcoal">
                    Transparansi Penuh
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal-500">
                    Asal daerah ditulis langsung oleh pengrajin tanpa klaim
                    sepihak, menghormati hak budaya komunitas asal.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Layout Kerja (Alur Ekosistem PAPEDA) */}
      <section className="border-b border-cream-300 bg-cream-100">
        <div className="container-page py-16 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeUp}
              className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-cream-300 pb-6"
            >
              <div>
                <p className="eyebrow">02 / Alur Kerja Ekosistem</p>
                <h2 className="mt-2 font-display text-3xl font-medium text-charcoal sm:text-4xl">
                  Bagaimana PAPEDA{" "}
                  <span className="font-serif text-[1.08em] font-normal italic text-charcoal">
                    bekerja
                  </span>
                </h2>
              </div>
              <p className="max-w-md text-xs leading-relaxed text-charcoal-500">
                Empat tahapan terstruktur mulai dari Produk Pilihan pendaftaran toko
                pengrajin hingga karya tiba di tangan pembeli.
              </p>
            </motion.div>

            {/* Architectural Blueprint Grid */}
            <ol className="grid gap-px border border-cream-300 bg-cream-300 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <motion.li
                    key={step.num}
                    variants={fadeUp}
                    className="flex flex-col justify-between bg-white p-7 transition-colors hover:bg-cream-50/70"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-cream-200 pb-4">
                        <span className="font-display text-2xl font-light text-earth-500">
                          {step.num}
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center border border-cream-300 bg-cream-50 text-charcoal">
                          <Icon className="h-4 w-4" strokeWidth={1.5} />
                        </span>
                      </div>
                      <p className="mt-5 text-[10px] font-medium uppercase tracking-eyebrow text-charcoal-400">
                        {step.phase}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-medium text-charcoal">
                        {step.title}
                      </h3>
                      <p className="mt-2.5 text-xs leading-relaxed text-charcoal-600">
                        {step.text}
                      </p>
                    </div>
                    <div className="mt-8 border-t border-cream-200 pt-3">
                      <span className="text-[10px] uppercase tracking-eyebrow text-charcoal-400">
                        Tahap {step.num} dari 04
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        </div>
      </section>

      {/* Untuk Siapa PAPEDA & Prinsip Tata Kelola */}
      <section className="container-page py-16 md:py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          <motion.div
            variants={fadeUp}
            className="mb-12 border-b border-cream-300 pb-6"
          >
            <p className="eyebrow">03 / Ekosistem Dua Arah</p>
            <h2 className="mt-2 font-display text-3xl font-medium text-charcoal sm:text-4xl">
              Untuk siapa PAPEDA{" "}
              <span className="font-serif text-[1.08em] font-normal italic text-charcoal">
                dirancang
              </span>
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {AUDIENCES.map((audience) => {
              const Icon = audience.icon;
              return (
                <motion.div
                  key={audience.title}
                  variants={fadeUp}
                  className="card flex flex-col justify-between p-8 transition-colors hover:border-charcoal-400"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-cream-200 pb-4">
                      <span className="text-[11px] font-medium uppercase tracking-eyebrow text-earth-500">
                        {audience.tag}
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center border border-cream-300 bg-cream-50 text-charcoal">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                    </div>
                    <h3 className="mt-6 font-display text-2xl font-normal tracking-tight text-charcoal">
                      {audience.title}
                    </h3>
                    <p className="mt-1 text-xs text-charcoal-500">
                      {audience.subtitle}
                    </p>
                    <ul className="mt-6 space-y-3 border-t border-cream-200 pt-5 text-xs leading-relaxed text-charcoal-600">
                      {audience.points.map((point) => (
                        <li key={point} className="flex items-start gap-3">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-charcoal" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8 border-t border-cream-200 pt-5">
                    <Link
                      to={audience.to}
                      className="inline-flex items-center gap-1.5 border-b border-charcoal pb-0.5 text-xs font-medium uppercase tracking-eyebrow text-charcoal transition-opacity hover:opacity-60"
                    >
                      {audience.cta}
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Model Pendapatan & Etika Budaya */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <motion.div
              variants={fadeUp}
              className="card flex gap-4 bg-cream-50/70 p-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-cream-300 bg-white text-earth-500">
                <HandCoins className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-eyebrow text-charcoal-400">
                  Transparansi Komisi
                </p>
                <h3 className="mt-0.5 font-display text-base font-medium text-charcoal">
                  Model pendapatan adil
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-charcoal-600">
                  PAPEDA hanya menerapkan komisi pada nilai produk dari
                  transaksi yang berhasil dibayar; ongkos kirim tidak dikenai
                  potongan. Tarif komisi dikunci pada saat pesanan dibuat
                  sehingga perubahan tarif di masa depan tidak memengaruhi
                  transaksi lama.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="card flex gap-4 bg-cream-50/70 p-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-cream-300 bg-white text-earth-500">
                <Landmark className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-eyebrow text-charcoal-400">
                  Penghormatan Tradisi
                </p>
                <h3 className="mt-0.5 font-display text-base font-medium text-charcoal">
                  Etika &amp; keaslian budaya
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-charcoal-600">
                  Keterangan daerah asal karya ditulis langsung oleh
                  masing-masing pengrajin. PAPEDA tidak mengklaim asal suku atau
                  wilayah tertentu tanpa informasi dari pembuatnya, serta tidak
                  menggunakan simbol sakral secara sembarangan sebagai ornamen.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
