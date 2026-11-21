import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listReviewableItems, submitReview } from '../../services/orders';
import { DataState, EmptyState, Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Layout';
import RatingStars from '../../components/RatingStars';
import { imageOf, tanggal } from '../../utils/format';

function ReviewForm({ item, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (rating < 1) {
      setError('Pilih jumlah bintang terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submitReview(item.id, rating, comment.trim());
      toast.success('Ulasan terkirim.');
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-cream-200 pt-4">
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider text-charcoal-500">Penilaian Anda:</span>
        <RatingStars value={rating} size="h-5 w-5" onChange={setRating} />
      </div>
      <label htmlFor={`comment-${item.id}`} className="sr-only">Ulasan</label>
      <textarea id={`comment-${item.id}`} rows={2} maxLength={1000} className="input" placeholder="Ceritakan kualitas karya dan pengalaman pengiriman Anda (opsional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <p className="text-xs font-medium text-clay-600">{error}</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Kirim ulasan</button>
    </form>
  );
}

export default function Reviews() {
  const { profile } = useAuth();
  const state = useAsync(() => listReviewableItems(profile.id), [profile.id]);

  return (
    <>
      <PageHeader
        eyebrow="Apresiasi Karya"
        title="Ulasan produk"
        description="Setiap karya dari pesanan yang telah selesai dapat Anda beri penilaian satu kali."
      />
      <DataState state={state}>
        {(items) => items.length === 0 ? (
          <EmptyState icon={Star} title="Belum ada produk untuk diulas" description="Ulasan dapat ditulis setelah Anda mengonfirmasi pesanan diterima."
            action={<Link to="/akun/pesanan" className="btn btn-outline">Lihat pesanan</Link>} />
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="card flex gap-5 p-5 transition-colors hover:border-charcoal-300">
                <div className="h-24 w-20 shrink-0 overflow-hidden border border-cream-300 bg-cream-200">
                  <img src={imageOf(item.product_image)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-eyebrow text-earth-500">{item.store_name} • Selesai {tanggal(item.completed_at)}</p>
                  {item.product_id
                    ? <Link to={`/produk/${item.product_id}`} className="mt-1 block font-display text-base font-medium text-charcoal hover:text-earth-500">{item.product_name}</Link>
                    : <p className="mt-1 font-display text-base font-medium text-charcoal">{item.product_name}</p>}
                  {item.review ? (
                    <div className="mt-3 border-t border-cream-200 pt-3">
                      <RatingStars value={item.review.rating} />
                      {item.review.comment && <p className="mt-1.5 text-sm leading-relaxed text-charcoal-600">{item.review.comment}</p>}
                    </div>
                  ) : item.product_id ? (
                    <ReviewForm item={item} onDone={state.reload} />
                  ) : (
                    <p className="mt-3 text-xs text-charcoal-400">Produk sudah dihapus penjual sehingga tidak dapat diulas.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </>
  );
}
