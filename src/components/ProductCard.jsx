import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { rupiah, imageOf } from '../utils/format';

/** Kartu produk editorial 3:4 bergaya brand fashion modern (digunakan di seluruh katalog, home, dan toko). */
export default function ProductCard({ product }) {
  const soldOut = product.stock <= 0;
  const limited = !soldOut && product.stock <= 3;

  return (
    <Link to={`/produk/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-cream-200">
        <img
          src={imageOf(product.image_url)}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${
            soldOut ? 'opacity-70 grayscale-[20%]' : ''
          }`}
        />
        {soldOut && (
          <span className="absolute left-3 top-3 border border-cream-300 bg-cream-100/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-eyebrow text-charcoal">
            Habis
          </span>
        )}
        {limited && (
          <span className="absolute left-3 top-3 bg-clay-50/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-eyebrow text-clay-600">
            Sisa {product.stock}
          </span>
        )}
      </div>

      <div className="mt-3.5 space-y-1">
        <div className="flex items-start justify-between gap-3 text-[13px] leading-5">
          <p className="line-clamp-1 font-normal text-charcoal group-hover:underline group-hover:underline-offset-4">
            {product.name}
          </p>
          <p className="shrink-0 font-display font-medium text-earth-500">{rupiah(product.price)}</p>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-charcoal-400">
          <span className="truncate">
            {product.store_name}
            {(product.origin_region || product.store_city) ? ` — ${product.origin_region || product.store_city}` : ''}
          </span>
          {(product.rating_count > 0 || product.sold_count > 0) && (
            <span className="flex shrink-0 items-center gap-1.5 text-charcoal-500">
              {product.rating_count > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-charcoal text-charcoal" />
                  {Number(product.rating_avg).toFixed(1)}
                </span>
              )}
              {product.rating_count > 0 && product.sold_count > 0 && <span>·</span>}
              {product.sold_count > 0 && <span>{product.sold_count} terjual</span>}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Alias agar kompatibel dengan komponen yang mengimpor ProductTile. */
export function ProductTile({ product }) {
  return <ProductCard product={product} />;
}

export function ProductTileGrid({ products, cols = 4 }) {
  const gridCols = cols === 3
    ? 'grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12`}>
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}

export function ProductGrid({ products, cols = 4 }) {
  return <ProductTileGrid products={products} cols={cols} />;
}
