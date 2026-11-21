import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, Grid2X2, Grid3X3, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { searchProducts, listCategories, listStoreCities, buildCategoryTree, PAGE_SIZE } from '../../services/catalog';
import { ProductGrid } from '../../components/ProductCard';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Layout';
import { rupiah } from '../../utils/format';

const SORTS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'bestseller', label: 'Terlaris' },
  { value: 'price_asc', label: 'Harga: Rendah ke Tinggi' },
  { value: 'price_desc', label: 'Harga: Tinggi ke Rendah' },
];

const VISIBLE_LOCATIONS = 5;
const fromCsv = (value) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);
const toggle = (list, value) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

function FilterGroup({ title, children }) {
  return (
    <fieldset className="border-b border-cream-300 py-5 first:pt-0 last:border-0 last:pb-0">
      <legend className="float-left mb-3.5 w-full text-[11px] font-medium uppercase tracking-eyebrow text-charcoal-500">
        {title}
      </legend>
      <div className="clear-both space-y-2.5">{children}</div>
    </fieldset>
  );
}

function CheckItem({ label, checked, onChange, strong }) {
  return (
    <label className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-xs text-charcoal-600 transition-colors hover:text-charcoal">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 rounded-none border-cream-400 accent-charcoal"
      />
      <span className={strong ? 'font-medium uppercase tracking-wider text-charcoal' : ''}>{label}</span>
    </label>
  );
}

export default function Catalog() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const meta = useAsync(async () => {
    const [categories, cities] = await Promise.all([listCategories(), listStoreCities().catch(() => [])]);
    return { categories, cities };
  }, []);
  const categories = meta.data?.categories || [];
  const cities = meta.data?.cities || [];
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cols, setCols] = useState(4); // 3 atau 4 kolom di desktop ala lookbook brand baju
  const [openParents, setOpenParents] = useState([]);
  const [allLocations, setAllLocations] = useState(false);

  // URL adalah satu-satunya sumber keadaan filter, sehingga hasil pencarian bisa dibagikan.
  const slugCategory = slug ? categories.find((c) => c.slug === slug) : null;
  const filters = {
    q: params.get('q') || '',
    categoryIds: fromCsv(params.get('kategori')),
    locations: fromCsv(params.get('lokasi')),
    min: params.get('min') || '',
    max: params.get('max') || '',
    sort: params.get('urut') || 'newest',
    page: Math.max(1, Number(params.get('hal')) || 1),
  };
  const categoryKey = filters.categoryIds.join(',');
  const locationKey = filters.locations.join(',');
  const [draft, setDraft] = useState({ min: filters.min, max: filters.max });
  useEffect(() => { setDraft({ min: filters.min, max: filters.max }); }, [filters.min, filters.max]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const waitingForCategory = Boolean(slug) && meta.loading;
  const unknownSlug = Boolean(slug) && !meta.loading && !slugCategory;

  const results = useAsync(
    () => (waitingForCategory || unknownSlug
      ? Promise.resolve({ items: [], total: 0 })
      : searchProducts({
          query: filters.q,
          categoryId: slugCategory?.id,
          categoryIds: slug ? [] : filters.categoryIds,
          regions: filters.locations,
          min: filters.min,
          max: filters.max,
          sort: filters.sort,
          page: filters.page,
        })),
    [filters.q, slugCategory?.id, categoryKey, locationKey, filters.min, filters.max, filters.sort, filters.page, waitingForCategory, unknownSlug, slug]
  );

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ hal: '', ...changes }).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key); else next.set(key, String(value));
    });
    setParams(next);
  };

  const toggleCategory = (id) => update({ kategori: toggle(filters.categoryIds, id).join(',') });
  const toggleLocation = (city) => update({ lokasi: toggle(filters.locations, city).join(',') });

  const applyPrice = (event) => {
    event.preventDefault();
    const swapped = draft.min !== '' && draft.max !== '' && Number(draft.min) > Number(draft.max);
    update(swapped ? { min: draft.max, max: draft.min } : { min: draft.min, max: draft.max });
  };

  const activeCount = (slug ? 0 : filters.categoryIds.length) + filters.locations.length + (filters.min ? 1 : 0) + (filters.max ? 1 : 0);
  const title = slugCategory ? slugCategory.name : filters.q ? `"${filters.q}"` : 'Semua Koleksi';
  const eyebrowText = slugCategory ? 'Kategori Pilihan' : filters.q ? 'Hasil Pencarian' : 'Katalog Pengrajin Papua';
  const shownCities = allLocations ? cities : cities.filter((city, index) => index < VISIBLE_LOCATIONS || filters.locations.includes(city));

  // Subkategori atau kategori utama untuk quick-navigation bar di atas katalog
  const activeParent = slugCategory
    ? tree.find((p) => p.id === (slugCategory.parent_id || slugCategory.id))
    : null;

  if (unknownSlug) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={SearchX} title="Kategori tidak ditemukan" description="Kategori ini mungkin sudah dihapus atau dinonaktifkan."
          action={<Link to="/kategori" className="btn btn-primary">Lihat semua kategori</Link>} />
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14">
      {/* Editorial Header */}
      <header className="mb-8">
        <p className="eyebrow">{eyebrowText}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-light tracking-tight text-charcoal sm:text-5xl">
            {slugCategory ? (
              <>
                Koleksi <span className="font-display font-medium text-charcoal">{slugCategory.name}</span>
              </>
            ) : filters.q ? (
              <>
                Pencarian <span className="font-display font-medium text-charcoal">{title}</span>
              </>
            ) : (
              <>
                Semua <span className="font-display font-medium text-charcoal">Koleksi</span>
              </>
            )}
          </h1>
          <p className="text-xs font-medium uppercase tracking-eyebrow text-charcoal-500">
            {results.loading ? 'Memuat karya...' : `${results.data?.total ?? 0} Karya`}
          </p>
        </div>
        {slugCategory?.description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">{slugCategory.description}</p>
        )}

        {/* Quick Category Strip ala Brand Clothing Modern */}
        {!slug && tree.length > 0 && (
          <nav aria-label="Kategori cepat" className="mt-8 flex gap-6 overflow-x-auto border-b border-cream-300 pb-3">
            <button
              type="button"
              onClick={() => update({ kategori: '' })}
              className={`whitespace-nowrap text-xs font-medium uppercase tracking-eyebrow transition-colors ${
                filters.categoryIds.length === 0 ? 'text-charcoal link-active' : 'text-charcoal-400 hover:text-charcoal'
              }`}
            >
              Semua
            </button>
            {tree.map((parent) => {
              const isSelected = filters.categoryIds.length === 1 && filters.categoryIds[0] === String(parent.id);
              return (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => update({ kategori: isSelected ? '' : parent.id })}
                  className={`whitespace-nowrap text-xs font-medium uppercase tracking-eyebrow transition-colors ${
                    isSelected ? 'text-charcoal link-active' : 'text-charcoal-400 hover:text-charcoal'
                  }`}
                >
                  {parent.name}
                </button>
              );
            })}
          </nav>
        )}

        {slug && activeParent && (
          <nav aria-label="Subkategori" className="mt-8 flex gap-6 overflow-x-auto border-b border-cream-300 pb-3">
            <Link
              to="/produk"
              className="whitespace-nowrap text-xs font-medium uppercase tracking-eyebrow text-charcoal-400 transition-colors hover:text-charcoal"
            >
              Semua Koleksi
            </Link>
            <Link
              to={`/kategori/${activeParent.slug}`}
              className={`whitespace-nowrap text-xs font-medium uppercase tracking-eyebrow transition-colors ${
                slugCategory.id === activeParent.id ? 'text-charcoal link-active' : 'text-charcoal-400 hover:text-charcoal'
              }`}
            >
              Semua {activeParent.name}
            </Link>
            {activeParent.children.map((child) => (
              <Link
                key={child.id}
                to={`/kategori/${child.slug}`}
                className={`whitespace-nowrap text-xs font-medium uppercase tracking-eyebrow transition-colors ${
                  child.id === slugCategory.id ? 'text-charcoal link-active' : 'text-charcoal-400 hover:text-charcoal'
                }`}
              >
                {child.name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Utility Bar: Filter Drawer Trigger, Active Filter Chips, Sort, & Grid Column Switcher */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-cream-300 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            className="inline-flex items-center gap-2 border border-charcoal bg-transparent px-4 py-2 text-xs font-medium uppercase tracking-eyebrow text-charcoal transition-colors hover:bg-charcoal hover:text-cream-100"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            Filter {activeCount > 0 ? `(${activeCount})` : ''}
          </button>

          {/* Active filter chips */}
          {filters.q && (
            <button
              type="button"
              onClick={() => update({ q: '' })}
              className="inline-flex items-center gap-1.5 border border-cream-300 bg-white px-2.5 py-1.5 text-[11px] text-charcoal hover:border-charcoal"
            >
              <span>Kata kunci: {filters.q}</span>
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
          {!slug && filters.categoryIds.map((catId) => {
            const cat = categories.find((c) => String(c.id) === String(catId));
            if (!cat) return null;
            return (
              <button
                key={catId}
                type="button"
                onClick={() => toggleCategory(catId)}
                className="inline-flex items-center gap-1.5 border border-cream-300 bg-white px-2.5 py-1.5 text-[11px] text-charcoal hover:border-charcoal"
              >
                <span>{cat.name}</span>
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
            );
          })}
          {filters.locations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => toggleLocation(loc)}
              className="inline-flex items-center gap-1.5 border border-cream-300 bg-white px-2.5 py-1.5 text-[11px] text-charcoal hover:border-charcoal"
            >
              <span>{loc}</span>
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          ))}
          {(filters.min || filters.max) && (
            <button
              type="button"
              onClick={() => update({ min: '', max: '' })}
              className="inline-flex items-center gap-1.5 border border-cream-300 bg-white px-2.5 py-1.5 text-[11px] text-charcoal hover:border-charcoal"
            >
              <span>
                {filters.min ? rupiah(filters.min) : 'Rp 0'} – {filters.max ? rupiah(filters.max) : 'Maks'}
              </span>
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => update({ kategori: '', lokasi: '', min: '', max: '' })}
              className="text-[11px] font-medium uppercase tracking-wider text-charcoal-500 underline underline-offset-4 hover:text-charcoal"
            >
              Reset
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-5">
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-[11px] uppercase tracking-eyebrow text-charcoal-400">Urutkan:</label>
            <select
              id="sort"
              className="border-0 border-b border-cream-300 bg-transparent py-1 pr-6 text-xs font-medium uppercase tracking-wider text-charcoal focus:border-charcoal focus:outline-none focus:ring-0"
              value={filters.sort}
              onChange={(event) => update({ urut: event.target.value === 'newest' ? '' : event.target.value })}
            >
              {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </div>

          {/* Grid View Switcher (3 vs 4 Columns on Desktop) */}
          <div className="hidden items-center gap-1 border-l border-cream-300 pl-4 lg:flex" role="group" aria-label="Tampilan kolom">
            <button
              type="button"
              onClick={() => setCols(3)}
              aria-label="Tampilan 3 kolom"
              title="Tampilan 3 kolom"
              className={`p-1.5 transition-colors ${cols === 3 ? 'text-charcoal' : 'text-charcoal-300 hover:text-charcoal-600'}`}
            >
              <Grid2X2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setCols(4)}
              aria-label="Tampilan 4 kolom"
              title="Tampilan 4 kolom"
              className={`p-1.5 transition-colors ${cols === 4 ? 'text-charcoal' : 'text-charcoal-300 hover:text-charcoal-600'}`}
            >
              <Grid3X3 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid Full-Width (3:4 Editorial Cards) */}
      <div>
        {results.loading && !results.data ? (
          <PageLoader label="Menyiapkan koleksi" />
        ) : results.error ? (
          <ErrorState message={results.error} onRetry={results.reload} />
        ) : results.data.items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Tidak ada karya yang cocok"
            description="Coba gunakan kata kunci lain, perlebar rentang harga, atau kurangi filter yang dipilih."
            action={
              <button
                type="button"
                onClick={() => update({ q: '', kategori: '', lokasi: '', min: '', max: '' })}
                className="btn btn-outline"
              >
                Tampilkan semua koleksi
              </button>
            }
          />
        ) : (
          <div className={`transition-opacity ${results.loading ? 'opacity-60' : ''}`}>
            <ProductGrid products={results.data.items} cols={cols} />
            <Pagination
              page={filters.page}
              pageSize={PAGE_SIZE}
              total={results.data.total}
              onChange={(page) => update({ hal: page === 1 ? '' : page })}
            />
          </div>
        )}
      </div>

      {/* Slide-over Filter Drawer (Gaya E-commerce Clothing Modern) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Filter produk"
            className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-cream-300 bg-cream-50"
          >
            <div className="flex items-center justify-between border-b border-cream-300 bg-white px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-eyebrow text-earth-500">Kurasi</p>
                <h2 className="font-display text-base font-medium uppercase tracking-wider text-charcoal">
                  Filter Koleksi {activeCount > 0 ? `(${activeCount})` : ''}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup filter"
                className="p-2 text-charcoal-500 transition-colors hover:bg-cream-100 hover:text-charcoal"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {!slug && tree.length > 0 && (
                <FilterGroup title="Kategori">
                  {tree.map((parent) => {
                    const childSelected = parent.children.some((child) => filters.categoryIds.includes(child.id));
                    const open = openParents.includes(parent.id) || childSelected;
                    return (
                      <div key={parent.id}>
                        <div className="flex items-center justify-between gap-2">
                          <CheckItem
                            strong
                            label={parent.name}
                            checked={filters.categoryIds.includes(parent.id)}
                            onChange={() => toggleCategory(parent.id)}
                          />
                          {parent.children.length > 0 && (
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-label={`Subkategori ${parent.name}`}
                              onClick={() => setOpenParents(toggle(openParents, parent.id))}
                              className="p-1 text-charcoal-400 hover:text-charcoal"
                            >
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                        {open && (
                          <div className="ml-6 mt-2.5 space-y-2.5 border-l border-cream-300 pl-3">
                            {parent.children.map((child) => (
                              <CheckItem
                                key={child.id}
                                label={child.name}
                                checked={filters.categoryIds.includes(child.id) || filters.categoryIds.includes(parent.id)}
                                onChange={() => {
                                  if (filters.categoryIds.includes(parent.id)) {
                                    const others = parent.children.map((c) => c.id).filter((cid) => cid !== child.id);
                                    update({ kategori: [...filters.categoryIds.filter((cid) => cid !== parent.id && !others.includes(cid)), ...others].join(',') });
                                  } else toggleCategory(child.id);
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </FilterGroup>
              )}

              {cities.length > 0 && (
                <FilterGroup title="Daerah Pengrajin">
                  {shownCities.map((city) => (
                    <CheckItem
                      key={city}
                      label={city}
                      checked={filters.locations.includes(city)}
                      onChange={() => toggleLocation(city)}
                    />
                  ))}
                  {cities.length > VISIBLE_LOCATIONS && (
                    <button
                      type="button"
                      onClick={() => setAllLocations((v) => !v)}
                      aria-expanded={allLocations}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-charcoal hover:text-earth-500"
                    >
                      {allLocations ? 'Lebih sedikit' : `Lihat semua (${cities.length})`}
                      <ChevronDown className={`h-3.5 w-3.5 ${allLocations ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                    </button>
                  )}
                </FilterGroup>
              )}

              <FilterGroup title="Rentang Harga (Rp)">
                <form onSubmit={applyPrice} className="space-y-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="Minimum"
                      aria-label="Harga minimum"
                      className="input px-3 py-2 text-xs"
                      value={draft.min}
                      onChange={(event) => setDraft({ ...draft, min: event.target.value })}
                    />
                    <span className="text-charcoal-400">—</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="Maksimum"
                      aria-label="Harga maksimum"
                      className="input px-3 py-2 text-xs"
                      value={draft.max}
                      onChange={(event) => setDraft({ ...draft, max: event.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-outline btn-sm w-full">Terapkan harga</button>
                </form>
              </FilterGroup>
            </div>

            <div className="flex items-center gap-3 border-t border-cream-300 bg-white px-6 py-4">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => update({ kategori: '', lokasi: '', min: '', max: '' })}
                  className="btn btn-outline flex-1"
                >
                  Hapus ({activeCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="btn btn-primary flex-1"
              >
                Lihat {results.data?.total ?? 0} Karya
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
