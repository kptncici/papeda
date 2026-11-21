const TONES = {
  amber: 'border-earth-200 bg-earth-50 text-earth-700',
  blue: 'border-cream-300 bg-cream-100 text-charcoal-700',
  indigo: 'border-cream-300 bg-cream-100 text-charcoal-700',
  violet: 'border-earth-200 bg-earth-50 text-earth-700',
  green: 'border-forest-200 bg-forest-50 text-forest-700',
  red: 'border-clay-200 bg-clay-50 text-clay-600',
  gray: 'border-cream-300 bg-cream-100 text-charcoal-600',
  earth: 'border-earth-200 bg-earth-50 text-earth-700',
};

const DOTS = {
  amber: 'bg-earth-500',
  blue: 'bg-charcoal-500',
  indigo: 'bg-charcoal-600',
  violet: 'bg-earth-600',
  green: 'bg-forest-600',
  red: 'bg-clay-500',
  gray: 'bg-charcoal-400',
  earth: 'bg-earth-500',
};

export function Badge({ tone = 'gray', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${TONES[tone] || TONES.gray}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone] || DOTS.gray}`} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Menampilkan label status dari peta { nilai: { label, tone } } di utils/format.js. */
export function StatusBadge({ map, value }) {
  const entry = map[value] || { label: value, tone: 'gray' };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
