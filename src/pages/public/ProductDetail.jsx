import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, MapPin, PackageX, ShoppingBag, Store } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { getProduct, listProductReviews } from '../../services/catalog';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { DataState, EmptyState, Spinner } from '../../components/ui/Feedback';
import QuantityInput from '../../components/QuantityInput';
import RatingStars from '../../components/RatingStars';
import { imageOf, rupiah, tanggal } from '../../utils/format';

function Gallery({ images, name }) {
  const sorted = useMemo(
    () => [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order),
    [images]
  );
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [images]);
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg border border-cream-300 bg-cream-200">
        <img src={imageOf(sorted[active]?.url)} alt={name} className="h-full w-full object-cover" />
      </div>
      {sorted.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {sorted.map((image, index) => (
            <button key={image.id} type="button" onClick={() => setActive(index)} aria-label={`Foto ${index + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${index === active ? 'border-charcoal' : 'border-transparent'}`}>
              <img src={image.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  const state = useAsync(async () => {
    const [product, reviews] = await Promise.all([getProduct(id), listProductReviews(id)]);
    return { product, reviews };
  }, [id]);
  useEffect(() => { setQuantity(1); }, [id]);

  const addToCart = async (thenGoToCart) => {
    if (!profile) {
      navigate('/masuk', { state: { from: location.pathname } });
      return;
    }
    if (profile.role !== 'buyer') {
      toast.error('Keranjang hanya tersedia untuk akun pembeli.');
      return;
    }
    setBusy(true);
    try {
      await cart.add(id, quantity);
      toast.success('Produk masuk ke keranjang.');
      if (thenGoToCart) navigate('/keranjang');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page py-8">
      <DataState state={state}>
        {({ product, reviews }) => {
          if (!product) {
            return <EmptyState icon={PackageX} title="Produk tidak ditemukan" description="Produk ini mungkin sudah dihapus atau sedang tidak dijual."
              action={<Link to="/produk" className="btn btn-primary">Lihat produk lain</Link>} />;
          }
          const purchasable = product.status === 'active' && product.moderation_status === 'approved' && product.store?.status === 'approved';
          const soldOut = product.stock <= 0;
          return (
            <>
              <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-charcoal-600" aria-label="Jejak halaman">
                <Link to="/produk" className="hover:text-earth-500">Produk</Link>
                <ChevronRight className="h-4 w-4" />
                {product.category && <><Link to={`/kategori/${product.category.slug}`} className="hover:text-earth-500">{product.category.name}</Link><ChevronRight className="h-4 w-4" /></>}
                <span className="truncate text-charcoal">{product.name}</span>
              </nav>

              <div className="grid gap-8 lg:grid-cols-2">
                <Gallery images={product.images || []} name={product.name} />
                <div>
                  <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-charcoal-600">
                    {product.rating_count > 0
                      ? <span className="flex items-center gap-1.5"><RatingStars value={product.rating_avg} />{Number(product.rating_avg).toFixed(1)} dari {product.rating_count} ulasan</span>
                      : <span>Belum ada ulasan</span>}
                    {product.sold_count > 0 && <span>{product.sold_count} terjual</span>}
                  </div>
                  <p className="mt-5 font-display text-4xl font-bold text-earth-500">{rupiah(product.price)}</p>

                  <dl className="mt-5 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
                    <dt className="text-charcoal-600">Stok</dt>
                    <dd className={soldOut ? 'font-semibold text-red-700' : ''}>{soldOut ? 'Habis' : `${product.stock} tersedia`}</dd>
                    <dt className="text-charcoal-600">Kategori</dt>
                    <dd>{product.category?.name || '-'}</dd>
                    {product.origin_region && <><dt className="text-charcoal-600">Daerah asal</dt><dd className="flex items-center gap-1"><MapPin className="h-4 w-4 text-earth-500" />{product.origin_region}</dd></>}
                    <dt className="text-charcoal-600">Ditambahkan</dt>
                    <dd>{tanggal(product.created_at)}</dd>
                  </dl>

                  {!purchasable ? (
                    <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Produk ini sedang tidak dijual.</p>
                  ) : (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <QuantityInput value={quantity} max={product.stock} onChange={setQuantity} disabled={soldOut || busy} />
                      <button type="button" className="btn btn-outline" disabled={soldOut || busy} onClick={() => addToCart(false)}>
                        {busy ? <Spinner className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}Tambah ke keranjang
                      </button>
                      <button type="button" className="btn btn-primary" disabled={soldOut || busy} onClick={() => addToCart(true)}>Beli sekarang</button>
                    </div>
                  )}

                  {product.store && (
                    <Link to={`/toko/${product.store.id}`} className="mt-7 flex items-center gap-4 rounded-lg border border-cream-300 bg-white p-4 hover:border-charcoal-400">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-200 text-charcoal-600">
                        {product.store.image_url ? <img src={product.store.image_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-semibold">{product.store.name}</span>
                        <span className="block text-xs text-charcoal-600">{[product.store.city, product.store.region].filter(Boolean).join(', ')}</span>
                      </span>
                      <span className="text-sm font-semibold text-charcoal">Kunjungi toko</span>
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
                <section>
                  <h2 className="text-xl font-semibold">Deskripsi produk</h2>
                  <p className="mt-3 max-w-prose whitespace-pre-line text-sm leading-7 text-charcoal-600">{product.description || 'Penjual belum menambahkan deskripsi.'}</p>
                </section>
                <section>
                  <h2 className="text-xl font-semibold">Ulasan pembeli</h2>
                  {reviews.length === 0
                    ? <p className="mt-3 text-sm text-charcoal-600">Belum ada ulasan. Ulasan dapat ditulis pembeli setelah pesanannya selesai.</p>
                    : (
                      <ul className="mt-3 space-y-4">
                        {reviews.map((review) => (
                          <li key={review.id} className="border-b border-cream-300 pb-4 last:border-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{review.buyer_name}</p>
                              <p className="text-xs text-charcoal-400">{tanggal(review.created_at)}</p>
                            </div>
                            <RatingStars value={review.rating} />
                            {review.comment && <p className="mt-1 text-sm leading-6 text-charcoal-600">{review.comment}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                </section>
              </div>
            </>
          );
        }}
      </DataState>
    </div>
  );
}
