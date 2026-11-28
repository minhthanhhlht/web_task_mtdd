// Người phụ trách: ảnh đại diện chữ cái đầu + tên đăng nhập.
import { Avatar } from '@astryxdesign/core/Avatar';

export default function UserChip({ name, showName = true, className = '' }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <Avatar name={String(name ?? '')} size="xsm" tooltip={false} />
      {showName && <span className="truncate">{name}</span>}
    </span>
  );
}
