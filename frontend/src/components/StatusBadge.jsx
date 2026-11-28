// Huy hiệu trạng thái task theo màu của trạng thái (không tìm thấy trạng thái thì màu xám).
import { Badge } from '@astryxdesign/core/Badge';
import { STATUS_COLOR_OPTIONS } from '../constants.js';
import { useStatuses } from './StatusContext.jsx';

export default function StatusBadge({ name, color }) {
  const { getStatus } = useStatuses();
  const key = color ?? getStatus(name)?.mau ?? 'gray';
  return <Badge variant={(STATUS_COLOR_OPTIONS[key] ?? STATUS_COLOR_OPTIONS.gray).variant} label={name} />;
}
