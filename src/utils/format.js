const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('id-ID');

export const rupiah = (value) => idr.format(Number(value || 0));
export const angka = (value) => num.format(Number(value || 0));

export function tanggal(value, withTime = false) {
  if (!value) return '-';
  const options = withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(value).toLocaleString('id-ID', options);
}

export const isoDate = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const PLACEHOLDER_IMAGE = '/demo/placeholder.svg';
export const imageOf = (url) => url || PLACEHOLDER_IMAGE;

export const ORDER_STATUS = {
  pending_payment: { label: 'Menunggu pembayaran', tone: 'amber' },
  paid: { label: 'Dibayar', tone: 'blue' },
  processing: { label: 'Diproses', tone: 'indigo' },
  shipped: { label: 'Dikirim', tone: 'violet' },
  completed: { label: 'Selesai', tone: 'green' },
  cancelled: { label: 'Dibatalkan', tone: 'red' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'Menunggu', tone: 'amber' },
  paid: { label: 'Lunas', tone: 'green' },
  failed: { label: 'Gagal', tone: 'red' },
};

export const PAYMENT_METHOD = {
  bank_transfer: { label: 'Transfer bank', hint: 'Simulasi transfer ke rekening penampung PAPEDA.' },
  e_wallet: { label: 'E-wallet', hint: 'Simulasi pembayaran lewat dompet digital.' },
  cod: { label: 'Bayar di tempat (COD)', hint: 'Simulasi pembayaran tunai saat barang diterima.' },
};

export const STORE_STATUS = {
  pending: { label: 'Menunggu verifikasi', tone: 'amber' },
  approved: { label: 'Aktif', tone: 'green' },
  rejected: { label: 'Ditolak', tone: 'red' },
  suspended: { label: 'Ditangguhkan', tone: 'gray' },
};

export const COMMISSION_STATUS = {
  pending: { label: 'Menunggu pembayaran', tone: 'amber' },
  earned: { label: 'Diterima', tone: 'green' },
  cancelled: { label: 'Batal', tone: 'gray' },
};

export const ROLE_LABEL = { buyer: 'Pembeli', seller: 'Penjual', admin: 'Admin' };

export const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
