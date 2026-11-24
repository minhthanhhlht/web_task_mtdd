// Form thêm vấn đề QnA / Process cho task (ngày giờ do server tự ghi).
import { useState } from 'react';
import { BUTTON_PRIMARY, INPUT_CLASS, ISSUE_TYPES } from '../constants.js';
import FieldError from './FieldError.jsx';

export default function IssueForm({ onAdd }) {
  const [loai, setLoai] = useState(ISSUE_TYPES[0]);
  const [related, setRelated] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Gửi vấn đề mới
  const submit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) { setError('Vui lòng nhập lý do'); return; }
    setSaving(true);
    try {
      await onAdd({ loai, ly_do: reason.trim(), nguoi_lien_quan: related.trim() });
      setReason('');
      setRelated('');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Loại vấn đề" name="loai" className={INPUT_CLASS} value={loai} onChange={(event) => setLoai(event.target.value)}>
          {ISSUE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input className={`${INPUT_CLASS} flex-1`} aria-label="Người liên quan (không bắt buộc)" name="nguoi_lien_quan_khong_bat_buoc" placeholder="Người liên quan (không bắt buộc)" value={related} onChange={(event) => setRelated(event.target.value)} />
      </div>
      <input className={`w-full ${INPUT_CLASS} ${error ? 'border-red-500' : ''}`} aria-label="Lý do" name="ly_do" placeholder="Lý do" value={reason} onChange={(event) => { setReason(event.target.value); setError(''); }} />
      <FieldError message={error} />
      <button type="submit" className={BUTTON_PRIMARY} disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm vấn đề'}</button>
    </form>
  );
}
