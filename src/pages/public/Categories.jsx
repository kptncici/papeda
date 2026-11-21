import { Link } from 'react-router-dom';
import { ArrowUpRight, FolderTree } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { listCategories, buildCategoryTree } from '../../services/catalog';
import { DataState, EmptyState } from '../../components/ui/Feedback';

export default function Categories() {
  const state = useAsync(async () => buildCategoryTree(await listCategories()), []);
  return (
    <div className="container-page py-10 md:py-14">
      <header className="mb-10 border-b border-cream-300 pb-6">
        <p className="eyebrow">Taksonomi Katalog</p>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight text-charcoal sm:text-5xl">
          Indeks <span className="font-serif text-[1.08em] font-normal italic text-charcoal">Kategori</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          Pilih kategori utama atau subkategori untuk menelusuri karya tangan autentik dari seluruh toko pengrajin Papua.
        </p>
      </header>

      <DataState state={state}>
        {(tree) => tree.length === 0 ? (
          <EmptyState icon={FolderTree} title="Belum ada kategori" description="Admin belum menambahkan kategori produk." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tree.map((parent, idx) => (
              <section key={parent.id} className="card flex flex-col justify-between p-6 transition-colors hover:border-charcoal">
                <div>
                  <div className="flex items-center justify-between border-b border-cream-200 pb-3">
                    <span className="font-serif text-sm italic text-earth-500">0{idx + 1}</span>
                    <Link
                      to={`/kategori/${parent.slug}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-eyebrow text-charcoal-500 hover:text-charcoal"
                    >
                      Lihat koleksi<ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                  <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-charcoal">
                    <Link to={`/kategori/${parent.slug}`} className="hover:text-earth-500">{parent.name}</Link>
                  </h2>
                  {parent.description && (
                    <p className="mt-2 text-xs leading-relaxed text-charcoal-600">{parent.description}</p>
                  )}
                </div>

                {parent.children.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-2 border-t border-cream-200 pt-4">
                    {parent.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          to={`/kategori/${child.slug}`}
                          className="inline-block border border-cream-300 bg-cream-50 px-3 py-1 text-xs font-medium text-charcoal transition-colors hover:border-charcoal hover:bg-charcoal hover:text-cream-100"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </DataState>
    </div>
  );
}
