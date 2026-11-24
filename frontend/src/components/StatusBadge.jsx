// Huy hiệu trạng thái task: pill có chấm màu và viền mờ (không tìm thấy trạng thái thì màu xám).
import { STATUS_COLOR_OPTIONS } from '../constants.js';
import { useStatuses } from './StatusContext.jsx';

export default function StatusBadge({ name, color }) {
  const { getStatus } = useStatuses();
  const key = color ?? getStatus(name)?.mau ?? 'gray';
  const className = (STATUS_COLOR_OPTIONS[key] ?? STATUS_COLOR_OPTIONS.gray).className;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 ${className}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {name}
    </span>
  );
}
