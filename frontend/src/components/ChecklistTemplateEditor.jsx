// Admin: sửa mẫu checklist (thêm, đổi tên, đổi thứ tự, xóa, lưu / hoàn tác).
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { getTemplates, saveTemplates } from '../api.js';
import { useDialog } from './DialogContext.jsx';
import RowMenu from './RowMenu.jsx';
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
    <div className="flex flex-col gap-3">
      <ErrorBox message={error} onRetry={load} />
      <ol className="flex flex-col gap-2">
        {names.map((name, index) => (
          <li key={`${index}-${saved.length}`} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-right"><Text color="secondary">{index + 1}.</Text></span>
            <div className="min-w-0 flex-1 basis-40">
              <TextInput label={`Mục checklist ${index + 1}`} isLabelHidden value={name} onChange={(v) => setNames(names.map((n, i) => (i === index ? v : n)))} htmlName={`muc_${index + 1}`} />
            </div>
            <Button label="Lên" isIconOnly icon={<Icon icon={ArrowUp} />} isDisabled={index === 0} onClick={() => move(index, -1)} />
            <Button label="Xuống" isIconOnly icon={<Icon icon={ArrowDown} />} isDisabled={index === names.length - 1} onClick={() => move(index, 1)} />
            <RowMenu items={[{ label: 'Xóa mục', icon: 'trash', danger: true, onClick: () => remove(index) }]} />
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <div className="flex-1"><TextInput label="Thêm mục mới" isLabelHidden placeholder="Thêm mục mới" value={newName} onChange={setNewName} onEnter={add} htmlName="them_muc_moi" /></div>
        <Button label="Thêm mục" onClick={add} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button label={saving ? 'Đang lưu...' : 'Lưu mẫu'} variant="primary" isDisabled={!dirty || saving} onClick={save} />
        <Button label="Hoàn tác" isDisabled={!dirty} onClick={() => setNames(saved)} />
        {dirty && <Badge variant="warning" label="Mẫu có thay đổi chưa lưu" />}
      </div>
    </div>
  );
}
