// Màn hình đăng nhập (hoặc tạo tài khoản đầu tiên trên máy chủ nếu chưa có tài khoản nào).
import { useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { login, setupAccount } from '../api.js';
import PasswordField from '../components/PasswordField.jsx';

// Khung nền trang cho các màn hình ngoài AppShell
function Screen({ children }) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-(--color-background-body) p-4 pt-24">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

export default function Login({ needsSetup, canSetup, onDone }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (needsSetup && !canSetup) {
    return (
      <Screen>
        <Card><Text>Chưa có tài khoản nào. Hãy tạo tài khoản đầu tiên ngay trên máy chủ (mở http://127.0.0.1:6021 trên máy chủ).</Text></Card>
      </Screen>
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

  const status = (key) => (errors[key] ? { type: 'error', message: errors[key] } : undefined);

  return (
    <Screen>
      <Card>
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          <Heading level={1}>{canSetup ? 'Tạo tài khoản đầu tiên' : 'Đăng nhập'}</Heading>
          <TextInput label="Tên đăng nhập" htmlName="ten_dang_nhap" autoComplete="username" hasAutoFocus value={name} onChange={setName} status={status('name')} />
          <PasswordField label="Mật khẩu" htmlName="mat_khau" autoComplete={canSetup ? 'new-password' : 'current-password'} value={password} onChange={setPassword} status={status('password')} />
          {canSetup && <PasswordField label="Nhập lại mật khẩu" htmlName="mat_khau_nhap_lai" autoComplete="new-password" value={confirm} onChange={setConfirm} status={status('confirm')} />}
          <CheckboxInput label="Ghi nhớ đăng nhập" value={remember} onChange={setRemember} htmlName="ghi_nho" />
          {errors.form && <Banner status="error" title={errors.form} />}
          <Button type="submit" variant="primary" width="100%" label={saving ? 'Đang xử lý...' : canSetup ? 'Tạo tài khoản' : 'Đăng nhập'} isDisabled={saving} />
        </form>
      </Card>
    </Screen>
  );
}
