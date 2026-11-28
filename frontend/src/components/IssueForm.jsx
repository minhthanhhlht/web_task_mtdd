// Form thêm vấn đề QnA / Process cho task (ngày giờ do server tự ghi).
import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ISSUE_TYPES } from '../constants.js';

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
    <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-2 border-t border-(--color-border) pt-3">
      <div className="flex flex-wrap gap-2">
        <Selector label="Loại vấn đề" isLabelHidden value={loai} width={140} options={ISSUE_TYPES} onChange={(v) => setLoai(v ?? ISSUE_TYPES[0])} />
        <div className="min-w-40 flex-1">
          <TextInput label="Người liên quan (không bắt buộc)" isLabelHidden placeholder="Người liên quan (không bắt buộc)" value={related} onChange={setRelated} htmlName="nguoi_lien_quan_khong_bat_buoc" />
        </div>
      </div>
      <TextInput label="Lý do" isLabelHidden placeholder="Lý do" value={reason} htmlName="ly_do" onChange={(v) => { setReason(v); setError(''); }} status={error ? { type: 'error', message: error } : undefined} />
      <div><Button type="submit" variant="primary" label={saving ? 'Đang lưu...' : 'Thêm vấn đề'} isDisabled={saving} /></div>
    </form>
  );
}
