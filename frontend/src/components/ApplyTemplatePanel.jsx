// Admin: áp dụng mẫu checklist (GHI ĐÈ) cho task chưa hoàn thành đã có sẵn.
import { useState } from 'react';
import { applyTemplates } from '../api.js';
import { BUTTON_DANGER } from '../constants.js';
import { useDialog } from './DialogContext.jsx';
import TaskPicker from './TaskPicker.jsx';
import { useToast } from './Toast.jsx';

export default function ApplyTemplatePanel({ disabled }) {
  const dialog = useDialog();
  const toast = useToast();
  const [mode, setMode] = useState('all');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  // Xác nhận rồi ghi đè checklist theo mẫu hiện tại
  const apply = async () => {
    const target = mode === 'all' ? 'tất cả task chưa hoàn thành' : `${selected.length} task đã chọn`;
    const ok = await dialog.confirm({
      title: 'Áp dụng mẫu (ghi đè)',
      message: `GHI ĐÈ checklist của ${target} bằng mẫu hiện tại?\nMục không có trong mẫu sẽ bị XÓA, mục trùng tên giữ trạng thái tick. Không thể hoàn tác.`,
      confirmLabel: 'Ghi đè', danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await applyTemplates(mode === 'all' ? { all: true } : { task_ids: selected });
      const skipped = result.tasks_bo_qua > 0 ? ` (bỏ qua ${result.tasks_bo_qua} task đã hoàn thành)` : '';
      if (result.tasks_thay_doi === 0) toast.info(`Không có gì thay đổi, checklist đã đúng mẫu${skipped}`);
      else toast.success(`Đã ghi đè checklist của ${result.tasks_thay_doi}/${result.tasks} task (thêm ${result.muc_them}, xóa ${result.muc_xoa} mục)${skipped}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} /> Tất cả task chưa hoàn thành</label>
        <label className="flex items-center gap-1"><input type="radio" checked={mode === 'some'} onChange={() => setMode('some')} /> Chọn task cụ thể</label>
      </div>
      {mode === 'some' && <TaskPicker selected={selected} onChange={setSelected} />}
      <button type="button" className={`mt-3 ${BUTTON_DANGER}`} disabled={disabled || busy || (mode === 'some' && selected.length === 0)} onClick={apply}>
        {busy ? 'Đang áp dụng...' : 'Áp dụng mẫu (ghi đè)'}
      </button>
      {disabled && <p className="mt-1 text-xs text-warning">Hãy lưu hoặc hoàn tác mẫu trước khi áp dụng.</p>}
    </div>
  );
}
