// Một dòng vấn đề dạng danh sách (không bảng ngang): xem, sửa tại chỗ, đổi trạng thái Mở↔Đã xử lý, xóa có xác nhận.
import { useState } from 'react';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_SMALL, formatDateTime, INPUT_CLASS, ISSUE_TYPES } from '../constants.js';
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
      <li className="space-y-2 p-3">
        <div className="flex flex-wrap gap-2">
          <select className={INPUT_CLASS} value={draft.loai} onChange={(e) => setDraft({ ...draft, loai: e.target.value })}>
            {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className={`min-w-40 flex-1 ${INPUT_CLASS}`} aria-label="Người liên quan" name="nguoi_lien_quan" placeholder="Người liên quan" value={draft.nguoi_lien_quan} onChange={(e) => setDraft({ ...draft, nguoi_lien_quan: e.target.value })} />
        </div>
        <input className={`w-full ${INPUT_CLASS}`} value={draft.ly_do} onChange={(e) => setDraft({ ...draft, ly_do: e.target.value })} />
        <div className="flex gap-2">
          <button type="button" className={BUTTON_PRIMARY} onClick={save}>Lưu</button>
          <button type="button" className={BUTTON_SECONDARY} onClick={() => { setDraft(issue); setEditing(false); }}>Hủy</button>
        </div>
      </li>
    );
  }

  const done = issue.trang_thai === 'Đã xử lý';
  return (
    <li className="flex items-start gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-neutral-bg px-2.5 py-1 text-xs font-medium text-neutral ring-1 ring-inset ring-black/5">{issue.loai}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 ${done ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{issue.trang_thai}</span>
        </div>
        <p className="mt-1.5 break-words text-sm">{issue.ly_do}</p>
        <p className="mt-1 text-xs text-muted">{formatDateTime(issue.ngay_gio)}{issue.nguoi_lien_quan ? ` · ${issue.nguoi_lien_quan}` : ''}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" className={BUTTON_SMALL} onClick={() => onUpdate(issue.id, { trang_thai: done ? 'Mở' : 'Đã xử lý' })}>{done ? 'Mở lại' : 'Đã xử lý'}</button>
        <RowMenu items={[{ label: 'Sửa', icon: 'edit', onClick: () => { setDraft(issue); setEditing(true); } }, { label: 'Xóa vấn đề', icon: 'trash', danger: true, onClick: remove }]} />
      </div>
    </li>
  );
}
