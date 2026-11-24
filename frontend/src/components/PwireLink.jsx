// Liên kết Link Pwire (chỉ khi là URL http/https hợp lệ, không thì hiện chữ thường).
import { isHttpUrl } from '../constants.js';
import MenuIcon from './MenuIcon.jsx';

export default function PwireLink({ url, className = '', compact = false }) {
  if (!url) return <span className="text-muted">—</span>;
  if (!isHttpUrl(url)) return <span className={className}>{url}</span>;
  if (compact) {
    return (
      <a href={url.trim()} target="_blank" rel="noopener noreferrer" title={url} onClick={(event) => event.stopPropagation()} className={`inline-flex h-8 items-center gap-1 text-primary underline-offset-4 hover:text-primary-hover hover:underline ${className}`}>
        <MenuIcon name="external" className="size-3.5" /> Mở
      </a>
    );
  }
  return (
    <a href={url.trim()} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className={`text-primary hover:text-primary-hover hover:underline ${className}`}>
      {url}
    </a>
  );
}
