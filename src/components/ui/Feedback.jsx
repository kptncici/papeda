import { AlertTriangle, Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-4 w-4' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" strokeWidth={1.5} />;
}

export function PageLoader({ label = 'Memuat data' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-charcoal-500" role="status">
      <Spinner className="h-6 w-6 text-charcoal" />
      <p className="text-xs uppercase tracking-eyebrow">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert">
      <AlertTriangle className="h-7 w-7 text-clay-500" strokeWidth={1.5} />
      <p className="font-display text-base font-medium uppercase tracking-wider text-charcoal">Data tidak dapat dimuat</p>
      <p className="max-w-md text-sm text-charcoal-600">{message}</p>
      {onRetry && <button type="button" className="btn btn-outline btn-sm mt-2" onClick={onRetry}>Coba lagi</button>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-2.5 px-6 py-16 text-center">
      {Icon && <Icon className="mb-1 h-8 w-8 text-charcoal-400" strokeWidth={1.25} />}
      <p className="font-display text-lg font-normal tracking-tight text-charcoal">{title}</p>
      {description && <p className="max-w-md text-sm leading-relaxed text-charcoal-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Pembungkus status untuk hasil useAsync: loader, error, atau isi. */
export function DataState({ state, children, loader }) {
  if (state.loading && state.data == null) return loader || <PageLoader />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  return children(state.data);
}

export function InlineError({ children }) {
  if (!children) return null;
  return <p className="border border-clay-200 bg-clay-50 px-3.5 py-2.5 text-xs font-medium text-clay-700" role="alert">{children}</p>;
}
