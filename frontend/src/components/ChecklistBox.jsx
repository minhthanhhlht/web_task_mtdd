// Một mục checklist: checkbox + tên (gạch ngang khi xong) + giờ hoàn thành.
import { formatDateTime } from '../constants.js';

export default function ChecklistBox({ item, onToggle, disabled }) {
  return (
    <label className="flex items-start gap-2 py-1 text-sm">
      <input type="checkbox" className="mt-0.5" checked={Boolean(item.da_xong)} disabled={disabled} onChange={(event) => onToggle(item, event.target.checked)} />
      <span className={item.da_xong ? 'text-muted line-through' : ''}>
        {item.ten_muc}
        {item.da_xong && item.xong_luc ? <span className="ml-2 text-xs text-muted no-underline">xong lúc {formatDateTime(item.xong_luc)}</span> : null}
      </span>
    </label>
  );
}
