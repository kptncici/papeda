import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <p className="font-display text-8xl font-bold text-cream-300">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-charcoal-600">Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa kembali tautannya, atau lanjutkan dari salah satu halaman berikut.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary">Ke beranda</Link>
        <Link to="/produk" className="btn btn-outline">Lihat semua produk</Link>
      </div>
    </div>
  );
}
