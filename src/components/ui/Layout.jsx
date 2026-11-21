import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-cream-300 pb-6"
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-normal tracking-tight text-charcoal sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </motion.div>
  );
}

export function StatCard({ icon: Icon, label, value, note, tone = 'neutral' }) {
  const accentColors = {
    forest: 'text-forest-600',
    earth: 'text-earth-500',
    amber: 'text-earth-600',
    neutral: 'text-charcoal-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="card flex flex-col justify-between p-5 transition-colors hover:border-charcoal-300"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-eyebrow text-charcoal-500">{label}</p>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${accentColors[tone] || accentColors.neutral}`} strokeWidth={1.5} />}
      </div>
      <div className="mt-3 min-w-0">
        <p className="break-words font-display text-2xl font-normal tracking-tight text-charcoal">{value}</p>
        {note && <p className="mt-1 text-xs text-charcoal-400">{note}</p>}
      </div>
    </motion.div>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-between border-t border-cream-300 pt-6" aria-label="Halaman">
      <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />Sebelumnya
      </button>
      <span className="text-xs uppercase tracking-eyebrow text-charcoal-500">Halaman {page} / {pages}</span>
      <button type="button" className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Berikutnya<ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </nav>
  );
}

/** Deretan tab filter bergaya editorial minimalis (underline tab). options: [{ value, label }] */
export function FilterTabs({ options, value, onChange }) {
  return (
    <div className="mb-6 flex gap-6 overflow-x-auto border-b border-cream-300">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value || 'all'}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative -mb-px whitespace-nowrap pb-3 text-xs font-medium uppercase tracking-wider transition-colors ${
              active
                ? 'text-charcoal'
                : 'text-charcoal-500 hover:text-charcoal'
            }`}
          >
            {option.label}
            {active && (
              <motion.span
                layoutId="activeFilterTab"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-charcoal"
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
