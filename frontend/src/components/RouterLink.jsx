// Cầu nối liên kết của Astryx với react-router: đường dẫn nội bộ đi qua router, địa chỉ ngoài và đường dẫn /api/ (tải file) dùng thẻ <a> thường.
import { Link } from 'react-router-dom';

export default function RouterLink({ href, children, ...props }) {
  if (typeof href === 'string' && (/^(https?:|mailto:|tel:)/i.test(href) || href.startsWith('/api/'))) return <a href={href} {...props}>{children}</a>;
  return <Link to={href ?? '#'} {...props}>{children}</Link>;
}
