import { Star } from 'lucide-react';

export default function RatingStars({ value = 0, size = 'h-4 w-4', onChange }) {
  const rounded = Math.round(Number(value));
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`Rating ${rounded} dari 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = <Star className={`${size} ${star <= rounded ? 'fill-amber-400 text-amber-400' : 'text-cream-300'}`} />;
        return onChange
          ? <button key={star} type="button" role="radio" aria-checked={star === rounded} aria-label={`${star} bintang`} onClick={() => onChange(star)} className="rounded p-0.5">{icon}</button>
          : <span key={star}>{icon}</span>;
      })}
    </span>
  );
}
