// Admin: sửa mẫu checklist (thêm, đổi tên, đổi thứ tự, xóa, lưu / hoàn tác).
import RowMenu from './RowMenu.jsx';
import MenuIcon from './MenuIcon.jsx';
import { useCallback, useEffect, useState } from 'react';
import { getTemplates, saveTemplates } from '../api.js';
import { BUTTON_ICON, BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_CLASS } from '../constants.js';
import { useDialog } from './DialogContext.jsx';
import { ErrorBox, Loading } from './StateMessage.jsx';
import { useToast } from './Toast.jsx';

export default function ChecklistTemplateEditor({ onDirtyChange }) {
  const dialog = useDialog();
  const toast = useToast();
  const [saved, setSaved] = useState([]);
  const [names, setNames] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(saved) !== JSON.stringify(names);

  // Báo trang cha để khóa nút Áp dụng mẫu khi mẫu còn sửa dở
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = useCallback(() => {
    setLoading(true);
    getTemplates()
      .then((data) => { const list = data.items.map((i) => i.ten_muc); setSaved(list); setNames(list); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Đổi chỗ hai mục
  const move = (index, delta) => {
    const next = [...names];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setNames(next);
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (names.some((n) => n.toLowerCase() === name.toLowerCase())) { toast.error('Mục này đã có trong mẫu'); return; }
    setNames([...names, name]);
    setNewName('');
  };

  const remove = async (index) => {
    const ok = await dialog.confirm({ title: 'Xóa mục', message: `Xóa mục "${names[index]}" khỏi mẫu?`, confirmLabel: 'Xóa', danger: true });
    if (ok) setNames(names.filter((_, i) => i !== index));
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = await saveTemplates(names.map((ten_muc) => ({ ten_muc })));
      const list = data.items.map((i) => i.ten_muc);
      setSaved(list);
      setNames(list);
      toast.success('Đã lưu mẫu checklist');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  return (
    <div>
      <ErrorBox message={error} onRetry={load} />
      <ol className="space-y-1">
        {names.map((name, index) => (
          <li key={`${index}-${saved.length}`} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-right text-sm text-muted">{index + 1}.</span>
            <input aria-label={`Mục checklist ${index + 1}`} name={`muc_${index + 1}`} className={`min-w-0 flex-1 basis-40 ${INPUT_CLASS}`} value={name} onChange={(e) => setNames(names.map((n, i) => (i === index ? e.target.value : n)))} />
            <button type="button" className={BUTTON_ICON} disabled={index === 0} onClick={() => move(index, -1)} aria-label="Lên"><MenuIcon name="arrow-up" className="size-4" /></button>
            <button type="button" className={BUTTON_ICON} disabled={index === names.length - 1} onClick={() => move(index, 1)} aria-label="Xuống"><MenuIcon name="arrow-down" className="size-4" /></button>
            <RowMenu items={[{ label: 'Xóa mục', icon: 'trash', danger: true, onClick: () => remove(index) }]} />
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <input className={`flex-1 ${INPUT_CLASS}`} aria-label="Thêm mục mới" name="them_muc_moi" placeholder="Thêm mục mới" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className={BUTTON_SECONDARY} onClick={add}>Thêm mục</button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={BUTTON_PRIMARY} disabled={!dirty || saving} onClick={save}>{saving ? 'Đang lưu...' : 'Lưu mẫu'}</button>
        <button type="button" className={BUTTON_SECONDARY} disabled={!dirty} onClick={() => setNames(saved)}>Hoàn tác</button>
        {dirty && <span className="text-sm text-warning">Mẫu có thay đổi chưa lưu</span>}
      </div>
    </div>
  );
}
