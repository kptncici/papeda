import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, PackageX, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listCategories, buildCategoryTree } from '../../services/catalog';
import { getStoreProduct, saveProduct } from '../../services/seller';
import { Field } from '../../components/ui/Field';
import { DataState, EmptyState, InlineError, Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Layout';
import { validate, validateImage } from '../../utils/validators';

const MAX_IMAGES = 5;

function Editor({ product, categories }) {
  const { store } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const [values, setValues] = useState({
    name: product?.name || '', category_id: product?.category_id || '', description: product?.description || '',
    price: product?.price != null ? String(Number(product.price)) : '', stock: product?.stock != null ? String(product.stock) : '',
    origin_region: product?.origin_region || '', status: product?.status || 'active',
  });
  const initialImages = useMemo(() => [...(product?.images || [])].sort((a, b) => a.sort_order - b.sort_order), [product]);
  const [kept, setKept] = useState(initialImages);
  const [removed, setRemoved] = useState([]);
  const [fresh, setFresh] = useState([]); // [{ file, url }] foto baru, hanya pratinjau sampai disimpan
  const [primaryKey, setPrimaryKey] = useState(initialImages.find((image) => image.is_primary)?.id || initialImages[0]?.id || 'new-0');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setValues({ ...values, [field]: event.target.value });

  useEffect(() => () => fresh.forEach((item) => URL.revokeObjectURL(item.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFiles = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    const room = MAX_IMAGES - kept.length - fresh.length;
    const accepted = [];
    files.slice(0, Math.max(room, 0)).forEach((file) => {
      const problem = validateImage(file);
      if (problem) toast.error(problem);
      else accepted.push({ file, url: URL.createObjectURL(file) });
    });
    if (files.length > room) toast.error(`Maksimal ${MAX_IMAGES} foto per produk.`);
    if (accepted.length) setFresh([...fresh, ...accepted]);
  };

  const removeKept = (image) => {
    setKept(kept.filter((item) => item.id !== image.id));
    setRemoved([...removed, image]);
  };
  const removeFresh = (index) => {
    URL.revokeObjectURL(fresh[index].url);
    setFresh(fresh.filter((_, i) => i !== index));
    if (primaryKey.startsWith('new-')) setPrimaryKey(kept[0]?.id || 'new-0');
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(values, {
      name: (v) => (v.trim().length < 3 ? 'Nama produk minimal 3 karakter.' : v.trim().length > 120 ? 'Nama produk maksimal 120 karakter.' : null),
      category_id: (v) => (!v ? 'Pilih kategori.' : null),
      description: (v) => (v.trim().length < 20 ? 'Deskripsi minimal 20 karakter.' : null),
      price: (v) => (!(Number(v) > 0) ? 'Harga harus lebih dari 0.' : Number(v) > 1000000000 ? 'Harga terlalu besar.' : null),
      stock: (v) => (v === '' || !Number.isInteger(Number(v)) || Number(v) < 0 ? 'Stok harus bilangan bulat 0 atau lebih.' : Number(v) > 100000 ? 'Stok terlalu besar.' : null),
    });
    if (kept.length + fresh.length === 0) found.images = 'Tambahkan minimal satu foto produk.';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    const keys = [...kept.map((image) => image.id), ...fresh.map((_, index) => `new-${index}`)];
    setBusy(true);
    try {
      await saveProduct({
        storeId: store.id, productId: product?.id, values, newFiles: fresh.map((item) => item.file),
        removedImages: removed, keptImages: kept, primaryKey: keys.includes(primaryKey) ? primaryKey : keys[0],
      });
      toast.success(product ? 'Perubahan produk disimpan.' : 'Produk ditambahkan.');
      navigate('/seller/produk');
    } catch (error) {
      setFormError(`${error.message} Jika produk sudah tersimpan sebagian, buka daftar produk lalu ubah kembali.`);
    } finally {
      setBusy(false);
    }
  };

  const tiles = [
    ...kept.map((image) => ({ key: image.id, url: image.url, onRemove: () => removeKept(image) })),
    ...fresh.map((item, index) => ({ key: `new-${index}`, url: item.url, onRemove: () => removeFresh(index), isNew: true })),
  ];

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card space-y-4 p-5">
        <InlineError>{formError}</InlineError>
        {product?.moderation_status === 'blocked' && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">Produk ini diblokir admin dan tidak tampil ke pembeli. Catatan: {product.moderation_note || '-'}</p>
        )}
        <Field label="Nama produk" htmlFor="pr-name" error={errors.name} required>
          <input id="pr-name" className="input" maxLength={120} value={values.name} onChange={set('name')} />
        </Field>
        <Field label="Kategori" htmlFor="pr-category" error={errors.category_id} required>
          <select id="pr-category" className="input" value={values.category_id} onChange={set('category_id')}>
            <option value="">Pilih kategori</option>
            {tree.map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                {parent.children.length === 0 && <option value={parent.id}>{parent.name}</option>}
                {parent.children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Deskripsi" htmlFor="pr-desc" error={errors.description} hint="Bahan, ukuran, cara pembuatan, dan perawatan." required>
          <textarea id="pr-desc" rows={6} maxLength={5000} className="input" value={values.description} onChange={set('description')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Harga (Rp)" htmlFor="pr-price" error={errors.price} required>
            <input id="pr-price" type="number" min="1" step="1" inputMode="numeric" className="input" value={values.price} onChange={set('price')} />
          </Field>
          <Field label="Stok" htmlFor="pr-stock" error={errors.stock} required>
            <input id="pr-stock" type="number" min="0" step="1" inputMode="numeric" className="input" value={values.stock} onChange={set('stock')} />
          </Field>
          <Field label="Daerah asal" htmlFor="pr-region" hint="Opsional. Isi hanya jika Anda yakin.">
            <input id="pr-region" className="input" maxLength={80} value={values.origin_region} onChange={set('origin_region')} />
          </Field>
          <Field label="Status produk" htmlFor="pr-status">
            <select id="pr-status" className="input" value={values.status} onChange={set('status')}>
              <option value="active">Tayang di marketplace</option>
              <option value="inactive">Disembunyikan</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Foto produk</h2>
          <p className="mt-1 text-xs text-charcoal-600">Maksimal {MAX_IMAGES} foto. JPG, PNG, atau WebP, masing-masing hingga 20 MB (dikompres otomatis). Pilih satu sebagai foto utama.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {tiles.map((tile) => (
              <div key={tile.key} className={`relative aspect-square overflow-hidden rounded-lg border-2 ${primaryKey === tile.key ? 'border-charcoal' : 'border-cream-300'}`}>
                <img src={tile.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={tile.onRemove} aria-label="Hapus foto" className="absolute right-1 top-1 rounded-full bg-charcoal/80 p-1 text-white hover:bg-red-600"><X className="h-3.5 w-3.5" /></button>
                <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-1 bg-white/90 py-1 text-[11px] font-medium">
                  <input type="radio" name="primary" className="accent-charcoal" checked={primaryKey === tile.key} onChange={() => setPrimaryKey(tile.key)} />Utama
                </label>
                {tile.isNew && <span className="absolute left-1 top-1 rounded bg-earth-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Baru</span>}
              </div>
            ))}
            {tiles.length < MAX_IMAGES && (
              <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-cream-300 text-xs text-charcoal-600 hover:border-charcoal-400 hover:text-earth-500">
                <ImagePlus className="h-6 w-6" />Tambah foto
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={pickFiles} />
          {errors.images && <p className="mt-2 text-xs font-medium text-red-600">{errors.images}</p>}
        </section>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{product ? 'Simpan perubahan' : 'Simpan produk'}</button>
        <Link to="/seller/produk" className="btn btn-ghost w-full">Batal</Link>
      </div>
    </form>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const { store } = useAuth();
  const state = useAsync(async () => {
    const [categories, product] = await Promise.all([listCategories(), id ? getStoreProduct(store.id, id) : Promise.resolve(null)]);
    return { categories, product };
  }, [id, store.id]);

  return (
    <>
      <Link to="/seller/produk" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal hover:underline"><ArrowLeft className="h-4 w-4" />Daftar produk</Link>
      <PageHeader title={id ? 'Ubah produk' : 'Tambah produk'} />
      <DataState state={state}>
        {({ categories, product }) => (id && !product
          ? <EmptyState icon={PackageX} title="Produk tidak ditemukan" description="Produk ini tidak ada di toko Anda." />
          : <Editor key={product?.id || 'new'} product={product} categories={categories} />)}
      </DataState>
    </>
  );
}
