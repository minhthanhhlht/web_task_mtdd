// Cổng đăng nhập: hỏi /api/auth/me, chưa đăng nhập → Login, bị ép đổi mật khẩu → ForceChangePassword.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMe, logout as apiLogout } from '../api.js';
import ForceChangePassword from '../pages/ForceChangePassword.jsx';
import Login from '../pages/Login.jsx';
import { AuthContext } from './AuthContext.jsx';

export default function AuthGate({ children }) {
  const [state, setState] = useState({ loading: true, error: '', user: null, needsSetup: false, canSetup: false });

  // Tải thông tin phiên hiện tại
  const reload = useCallback(async () => {
    try {
      const data = await getMe();
      setState({ loading: false, error: '', user: data.user, needsSetup: data.needs_setup, canSetup: data.can_setup });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // API trả 401 / yêu cầu đổi mật khẩu thì nạp lại để quay về đúng màn hình
  useEffect(() => {
    window.addEventListener('auth-expired', reload);
    window.addEventListener('password-required', reload);
    return () => { window.removeEventListener('auth-expired', reload); window.removeEventListener('password-required', reload); };
  }, [reload]);

  // Đăng xuất rồi nạp lại trạng thái
  const logout = useCallback(async () => { await apiLogout().catch(() => null); await reload(); }, [reload]);
  const value = useMemo(() => ({ user: state.user, reload, logout }), [state.user, reload, logout]);

  if (state.loading) return <p className="p-6 text-sm text-muted">Đang tải...</p>;
  if (state.error && !state.user) {
    return <div className="m-6 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">{state.error}</div>;
  }
  if (!state.user) return <Login needsSetup={state.needsSetup} canSetup={state.canSetup} onDone={reload} />;
  if (state.user.bat_buoc_doi_mat_khau) return <AuthContext.Provider value={value}><ForceChangePassword /></AuthContext.Provider>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
