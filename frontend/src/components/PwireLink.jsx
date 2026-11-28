// Liên kết Link Pwire (chỉ khi là URL http/https hợp lệ, không thì hiện chữ thường).
import { Link } from '@astryxdesign/core/Link';
import { isHttpUrl } from '../constants.js';

export default function PwireLink({ url, compact = false }) {
  if (!url) return <span className="text-secondary">—</span>;
  if (!isHttpUrl(url)) return <span>{url}</span>;
  return <Link href={url.trim()} isExternalLink tooltip={compact ? url : undefined}>{compact ? 'Mở' : url}</Link>;
}
