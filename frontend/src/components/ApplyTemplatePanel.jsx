// Admin: áp dụng mẫu checklist (GHI ĐÈ) cho task chưa hoàn thành đã có sẵn.
import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Text } from '@astryxdesign/core/Text';
import { applyTemplates } from '../api.js';
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
    <div className="flex flex-col gap-3">
      <RadioList label="Phạm vi áp dụng" isLabelHidden orientation="horizontal" value={mode} onChange={setMode}>
        <RadioListItem label="Tất cả task chưa hoàn thành" value="all" />
        <RadioListItem label="Chọn task cụ thể" value="some" />
      </RadioList>
      {mode === 'some' && <TaskPicker selected={selected} onChange={setSelected} />}
      <div>
        <Button
          label={busy ? 'Đang áp dụng...' : 'Áp dụng mẫu (ghi đè)'}
          variant="destructive"
          isDisabled={disabled || busy || (mode === 'some' && selected.length === 0)}
          onClick={apply}
        />
      </div>
      {disabled && <Text type="supporting" color="secondary">Hãy lưu hoặc hoàn tác mẫu trước khi áp dụng.</Text>}
    </div>
  );
}
