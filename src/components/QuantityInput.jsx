import { Minus, Plus } from 'lucide-react';

export default function QuantityInput({ value, max, onChange, disabled }) {
  const set = (next) => {
    const clamped = Math.max(1, Math.min(max || 999, Number(next) || 1));
    if (clamped !== value) onChange(clamped);
  };
  return (
    <div className="inline-flex items-center border border-cream-300 bg-white">
      <button type="button" className="p-2 text-charcoal-600 transition-colors hover:bg-cream-100 hover:text-charcoal disabled:opacity-40" onClick={() => set(value - 1)} disabled={disabled || value <= 1} aria-label="Kurangi jumlah">
        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <input type="number" min="1" max={max} value={value} disabled={disabled} onChange={(event) => set(event.target.value)} aria-label="Jumlah"
        className="w-10 border-x border-cream-200 bg-transparent py-1 text-center text-xs font-medium text-charcoal focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
      <button type="button" className="p-2 text-charcoal-600 transition-colors hover:bg-cream-100 hover:text-charcoal disabled:opacity-40" onClick={() => set(value + 1)} disabled={disabled || (max != null && value >= max)} aria-label="Tambah jumlah">
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
