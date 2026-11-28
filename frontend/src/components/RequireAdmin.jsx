// Bọc trang chỉ dành cho admin; người dùng thường thấy thông báo không có quyền.
import { Banner } from '@astryxdesign/core/Banner';
import { useAuth } from './AuthContext.jsx';

export default function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (user?.vai_tro !== 'admin') {
    return <Banner status="error" title="Bạn không có quyền truy cập trang này (cần quản trị viên)." />;
  }
  return children;
}
