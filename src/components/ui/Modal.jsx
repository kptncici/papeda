import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Spinner } from './Feedback';

export function Modal({ open, title, onClose, children, footer, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 backdrop-blur-[1px] p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[92vh] w-full ${size} flex-col border border-cream-300 bg-white`}
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-cream-300 px-6 py-4">
          <h2 className="font-display text-base font-medium uppercase tracking-wider text-charcoal">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="p-1.5 text-charcoal-500 transition-colors hover:bg-cream-100 hover:text-charcoal">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2.5 border-t border-cream-200 bg-cream-50/50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Lanjutkan', danger, loading, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={onClose} size="max-w-md"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Batal</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner className="h-4 w-4" />}{confirmLabel}
          </button>
        </>
      }>
      <p className="text-sm leading-relaxed text-charcoal-600">{message}</p>
    </Modal>
  );
}
