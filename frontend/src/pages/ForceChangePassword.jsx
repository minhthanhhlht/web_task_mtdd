// Màn hình ép đổi mật khẩu lần đầu: thay cho toàn bộ ứng dụng (không có menu).
import { useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { changePassword } from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';

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

  const status = (key) => (errors[key] ? { type: 'error', message: errors[key] } : undefined);

  return (
    <div className="flex min-h-screen items-start justify-center bg-(--color-background-body) p-4 pt-24">
      <div className="w-full max-w-sm">
        <Card>
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <Heading level={1}>Bạn cần đổi mật khẩu</Heading>
            <input type="text" name="username" autoComplete="username" value={user?.ten_dang_nhap ?? ''} readOnly hidden />
            <Text color="secondary">Tài khoản này đang dùng mật khẩu mặc định/do quản trị viên đặt. Hãy đặt mật khẩu mới để tiếp tục.</Text>
            <PasswordField label="Mật khẩu hiện tại" htmlName="mat_khau_old" autoComplete="current-password" value={oldPassword} onChange={(v) => { setOldPassword(v); setErrors({}); }} status={status('old')} />
            <PasswordField label="Mật khẩu mới" htmlName="mat_khau_new" autoComplete="new-password" value={newPassword} onChange={(v) => { setNewPassword(v); setErrors({}); }} status={status('new')} />
            <PasswordField label="Nhập lại mật khẩu mới" htmlName="mat_khau_confirm" autoComplete="new-password" value={confirm} onChange={(v) => { setConfirm(v); setErrors({}); }} status={status('confirm')} />
            {errors.form && <Banner status="error" title={errors.form} />}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" label={saving ? 'Đang lưu...' : 'Đổi mật khẩu'} isDisabled={saving} />
              <Button label="Đăng xuất" onClick={logout} />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
