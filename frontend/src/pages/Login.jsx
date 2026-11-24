// Màn hình đăng nhập (hoặc tạo tài khoản đầu tiên trên máy chủ nếu chưa có tài khoản nào).
import { useState } from 'react';
import { login, setupAccount } from '../api.js';
import FieldError from '../components/FieldError.jsx';
import { BUTTON_PRIMARY, INPUT_CLASS } from '../constants.js';

export default function Login({ needsSetup, canSetup, onDone }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (needsSetup && !canSetup) {
    return (
      <div className="mx-auto mt-24 max-w-sm rounded-2xl border border-border bg-surface p-6 text-sm">
        Chưa có tài khoản nào. Hãy tạo tài khoản đầu tiên ngay trên máy chủ (mở http://127.0.0.1:6021 trên máy chủ).
      </div>
    );
  }

  // Gửi đăng nhập hoặc tạo tài khoản đầu tiên
  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!name.trim()) found.name = 'Vui lòng nhập tên đăng nhập';
    if (!password) found.password = 'Vui lòng nhập mật khẩu';
    if (canSetup && confirm !== password) found.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const body = { ten_dang_nhap: name.trim(), mat_khau: password, ghi_nho: remember };
      await (canSetup ? setupAccount(body) : login(body));
      await onDone();
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-24 w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">{canSetup ? 'Tạo tài khoản đầu tiên' : 'Đăng nhập'}</h1>
      <div>
        <label htmlFor="login-name" className="mb-1 block text-sm">Tên đăng nhập</label>
        <input id="login-name" name="ten_dang_nhap" autoComplete="username" className={`w-full ${INPUT_CLASS} ${errors.name ? 'border-red-500' : ''}`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <FieldError message={errors.name} />
      </div>
      <div>
        <label htmlFor="login-password" className="mb-1 block text-sm">Mật khẩu</label>
        <input id="login-password" name="mat_khau" autoComplete={canSetup ? 'new-password' : 'current-password'} type="password" className={`w-full ${INPUT_CLASS} ${errors.password ? 'border-red-500' : ''}`} value={password} onChange={(e) => setPassword(e.target.value)} />
        <FieldError message={errors.password} />
      </div>
      {canSetup && (
        <div>
          <label htmlFor="login-confirm" className="mb-1 block text-sm">Nhập lại mật khẩu</label>
          <input id="login-confirm" name="mat_khau_nhap_lai" autoComplete="new-password" type="password" className={`w-full ${INPUT_CLASS} ${errors.confirm ? 'border-red-500' : ''}`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <FieldError message={errors.confirm} />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ghi_nho" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Ghi nhớ đăng nhập</label>
      {errors.form && <p className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">{errors.form}</p>}
      <button type="submit" className={`w-full ${BUTTON_PRIMARY}`} disabled={saving}>{saving ? 'Đang xử lý...' : canSetup ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
    </form>
  );
}
