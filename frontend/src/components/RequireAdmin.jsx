// Bọc trang chỉ dành cho admin; người dùng thường thấy thông báo không có quyền.
import { useAuth } from './AuthContext.jsx';

export default function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (user?.vai_tro !== 'admin') {
    return <p className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">Bạn không có quyền truy cập trang này (cần quản trị viên).</p>;
  }
  return children;
}
