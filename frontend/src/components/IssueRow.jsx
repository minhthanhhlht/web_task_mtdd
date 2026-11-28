// Một dòng vấn đề dạng danh sách (không bảng ngang): xem, sửa tại chỗ, đổi trạng thái Mở↔Đã xử lý, xóa có xác nhận.
import { useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { formatDateTime, ISSUE_TYPES } from '../constants.js';
import { useDialog } from './DialogContext.jsx';
import RowMenu from './RowMenu.jsx';

export default function IssueRow({ issue, onUpdate, onDelete }) {
  const dialog = useDialog();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue);

  // Lưu phần sửa tại chỗ
  const save = async () => {
    await onUpdate(issue.id, { loai: draft.loai, ly_do: draft.ly_do, nguoi_lien_quan: draft.nguoi_lien_quan });
    setEditing(false);
  };

  // Xóa sau khi xác nhận
  const remove = async () => {
    const ok = await dialog.confirm({ title: 'Xóa vấn đề', message: `Xóa vấn đề "${issue.ly_do}"?`, confirmLabel: 'Xóa', danger: true });
    if (ok) onDelete(issue.id);
  };

  if (editing) {
    return (
      <li className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap gap-2">
          <Selector label="Loại vấn đề" isLabelHidden value={draft.loai} width={140} options={ISSUE_TYPES} onChange={(v) => setDraft({ ...draft, loai: v ?? draft.loai })} />
          <div className="min-w-40 flex-1"><TextInput label="Người liên quan" isLabelHidden placeholder="Người liên quan" value={draft.nguoi_lien_quan} onChange={(v) => setDraft({ ...draft, nguoi_lien_quan: v })} /></div>
        </div>
        <TextInput label="Lý do" isLabelHidden value={draft.ly_do} onChange={(v) => setDraft({ ...draft, ly_do: v })} />
        <div className="flex gap-2">
          <Button label="Lưu" variant="primary" onClick={save} />
          <Button label="Hủy" onClick={() => { setDraft(issue); setEditing(false); }} />
        </div>
      </li>
    );
  }

  const done = issue.trang_thai === 'Đã xử lý';
  return (
    <li className="flex items-start gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral" label={issue.loai} />
          <Badge variant={done ? 'success' : 'warning'} label={issue.trang_thai} />
        </div>
        <Text display="block"><span className="mt-1.5 block break-words">{issue.ly_do}</span></Text>
        <Text type="supporting" color="secondary" display="block">{formatDateTime(issue.ngay_gio)}{issue.nguoi_lien_quan ? ` · ${issue.nguoi_lien_quan}` : ''}</Text>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button label={done ? 'Mở lại' : 'Đã xử lý'} size="sm" onClick={() => onUpdate(issue.id, { trang_thai: done ? 'Mở' : 'Đã xử lý' })} />
        <RowMenu items={[{ label: 'Sửa', icon: 'edit', onClick: () => { setDraft(issue); setEditing(true); } }, { label: 'Xóa vấn đề', icon: 'trash', danger: true, onClick: remove }]} />
      </div>
    </li>
  );
}
