import { useState } from 'react';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listCategories, buildCategoryTree } from '../../services/catalog';
import { createCategory, updateCategory, deleteCategory } from '../../services/admin';
import { Field } from '../../components/ui/Field';
import { DataState, EmptyState, InlineError, Spinner } from '../../components/ui/Feedback';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/Layout';
import { Badge } from '../../components/ui/Badge';
import { slugify } from '../../utils/format';

const EMPTY = { name: '', slug: '', parent_id: '', description: '', sort_order: 0, is_active: true };

function CategoryForm({ initial, parents, onSaved, onCancel }) {
  const toast = useToast();
  const [values, setValues] = useState({ ...EMPTY, ...initial, parent_id: initial?.parent_id || '' });
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.id));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const slug = slugify(values.slug || values.name);
    if (values.name.trim().length < 2) return setError('Nama kategori minimal 2 karakter.');
    if (!slug) return setError('Slug tidak boleh kosong.');
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: values.name.trim(), slug, parent_id: values.parent_id || null, description: values.description.trim(),
        sort_order: Number(values.sort_order) || 0, is_active: values.is_active,
      };
      if (initial?.id) await updateCategory(initial.id, payload); else await createCategory(payload);
      toast.success('Kategori disimpan.');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <InlineError>{error}</InlineError>
      <Field label="Nama kategori" htmlFor="c-name" required>
        <input id="c-name" className="input" maxLength={80} value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value, slug: slugTouched ? values.slug : slugify(e.target.value) })} />
      </Field>
      <Field label="Slug (alamat URL)" htmlFor="c-slug" hint="Huruf kecil, angka, dan tanda hubung.">
        <input id="c-slug" className="input" value={values.slug} onChange={(e) => { setSlugTouched(true); setValues({ ...values, slug: e.target.value }); }} />
      </Field>
      <Field label="Kategori induk" htmlFor="c-parent">
        <select id="c-parent" className="input" value={values.parent_id} onChange={(e) => setValues({ ...values, parent_id: e.target.value })}>
          <option value="">Tidak ada (kategori utama)</option>
          {parents.filter((parent) => parent.id !== initial?.id).map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
        </select>
      </Field>
      <Field label="Deskripsi" htmlFor="c-desc">
        <textarea id="c-desc" rows={2} className="input" value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 items-end gap-4">
        <Field label="Urutan tampil" htmlFor="c-sort">
          <input id="c-sort" type="number" className="input" value={values.sort_order} onChange={(e) => setValues({ ...values, sort_order: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-xs font-medium uppercase tracking-wider text-charcoal">
          <input type="checkbox" className="h-4 w-4 accent-charcoal" checked={values.is_active} onChange={(e) => setValues({ ...values, is_active: e.target.checked })} />Tampilkan ke publik
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Batal</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Simpan kategori</button>
      </div>
    </form>
  );
}

export default function AdminCategories() {
  const toast = useToast();
  const state = useAsync(() => listCategories({ includeInactive: true }), []);
  const [editing, setEditing] = useState(null); // null | {} | category
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteCategory(removing.id);
      toast.success('Kategori dihapus.');
      setRemoving(null);
      state.reload();
    } catch (error) {
      toast.error(`${error.message} Pindahkan produk atau subkategorinya terlebih dahulu, atau nonaktifkan kategori ini.`);
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ category, child }) => (
    <tr>
      <td className={child ? 'pl-10 text-charcoal-600' : 'font-medium text-charcoal'}>
        {child && <span className="mr-2 text-charcoal-300">—</span>}
        {category.name}
      </td>
      <td className="font-mono text-xs text-charcoal-500">/{category.slug}</td>
      <td className="text-charcoal-500">{category.sort_order}</td>
      <td>{category.is_active ? <Badge tone="green">Tampil</Badge> : <Badge tone="gray">Disembunyikan</Badge>}</td>
      <td>
        <div className="flex justify-end gap-1">
          <button type="button" aria-label={`Ubah ${category.name}`} onClick={() => setEditing(category)} className="p-2 text-charcoal-500 transition-colors hover:bg-cream-200 hover:text-charcoal">
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label={`Hapus ${category.name}`} onClick={() => setRemoving(category)} className="p-2 text-charcoal-400 transition-colors hover:bg-clay-50 hover:text-clay-600">
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <PageHeader
        eyebrow="Taksonomi Katalog"
        title="Kategori"
        description="Struktur kategori utama dan subkategori yang digunakan pengrajin untuk mengelompokkan karya."
        actions={<button type="button" className="btn btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" strokeWidth={1.5} />Tambah kategori</button>}
      />
      <DataState state={state}>
        {(categories) => categories.length === 0 ? (
          <EmptyState icon={FolderTree} title="Belum ada kategori" description="Tambahkan kategori agar penjual dapat mengelompokkan produknya." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Nama kategori</th><th>Slug URL</th><th>Urutan</th><th>Status</th><th /></tr></thead>
              <tbody>
                {buildCategoryTree(categories).flatMap((parent) => [
                  <Row key={parent.id} category={parent} />,
                  ...parent.children.map((child) => <Row key={child.id} category={child} child />),
                ])}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
      <Modal open={Boolean(editing)} title={editing?.id ? 'Ubah kategori' : 'Tambah kategori'} onClose={() => setEditing(null)}>
        {editing && <CategoryForm key={editing.id || 'new'} initial={editing} parents={(state.data || []).filter((c) => !c.parent_id)}
          onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); state.reload(); }} />}
      </Modal>
      <ConfirmDialog open={Boolean(removing)} title="Hapus kategori" danger confirmLabel="Hapus kategori" loading={busy}
        message={`Kategori "${removing?.name}" akan dihapus. Kategori yang masih punya produk atau subkategori tidak dapat dihapus.`}
        onConfirm={remove} onClose={() => setRemoving(null)} />
    </>
  );
}
