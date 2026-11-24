// Ô icon người phụ trách: mỗi tên đăng nhập luôn ra cùng một sắc (cat-1..3) trên mọi màn.
import MenuIcon from './MenuIcon.jsx';

const TONES = ['bg-cat-1/10 text-cat-1', 'bg-cat-2/10 text-cat-2', 'bg-cat-3/10 text-cat-3'];

// Băm tên đăng nhập thành chỉ số sắc ổn định
function toneOf(name) {
  let hash = 0;
  for (const char of String(name ?? '')) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return TONES[hash % TONES.length];
}

export default function UserChip({ name, showName = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${toneOf(name)}`}><MenuIcon name="user" className="size-3.5" /></span>
      {showName && <span className="truncate">{name}</span>}
    </span>
  );
}
