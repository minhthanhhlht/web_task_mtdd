// Màn hình ép đổi mật khẩu lần đầu: thay cho toàn bộ ứng dụng (không có menu).
import { useState } from 'react';
import { changePassword } from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';
import FieldError from '../components/FieldError.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_CLASS } from '../constants.js';

export default function ForceChangePassword() {
  const { user, reload, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Kiểm tra rồi đổi mật khẩu; thành công thì nạp lại để vào ứng dụng
  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!oldPassword) found.old = 'Vui lòng nhập mật khẩu hiện tại';
    if (newPassword.length < 8) found.new = 'Mật khẩu mới tối thiểu 8 ký tự';
    else if (newPassword === oldPassword) found.new = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    if (confirm !== newPassword) found.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await changePassword({ mat_khau_cu: oldPassword, mat_khau_moi: newPassword });
      await reload();
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, value, setter) => (
    <div>
      <label htmlFor={`force-${key}`} className="mb-1 block text-sm">{label}</label>
      <PasswordInput id={`force-${key}`} name={`mat_khau_${key}`} autoComplete={key === 'old' ? 'current-password' : 'new-password'} className={`w-full ${INPUT_CLASS} ${errors[key] ? 'border-red-500' : ''}`} value={value} onChange={(e) => { setter(e.target.value); setErrors({}); }} />
      <FieldError message={errors[key]} />
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-24 w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">Bạn cần đổi mật khẩu</h1>
      <input type="text" name="username" autoComplete="username" value={user?.ten_dang_nhap ?? ''} readOnly hidden />
      <p className="text-sm text-muted">Tài khoản này đang dùng mật khẩu mặc định/do quản trị viên đặt. Hãy đặt mật khẩu mới để tiếp tục.</p>
      {field('old', 'Mật khẩu hiện tại', oldPassword, setOldPassword)}
      {field('new', 'Mật khẩu mới', newPassword, setNewPassword)}
      {field('confirm', 'Nhập lại mật khẩu mới', confirm, setConfirm)}
      {errors.form && <p className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">{errors.form}</p>}
      <div className="flex gap-2">
        <button type="submit" className={BUTTON_PRIMARY} disabled={saving}>{saving ? 'Đang lưu...' : 'Đổi mật khẩu'}</button>
        <button type="button" className={BUTTON_SECONDARY} onClick={logout}>Đăng xuất</button>
      </div>
    </form>
  );
}
