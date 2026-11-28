// Trang tài khoản: đổi mật khẩu của mình; admin quản lý thêm các tài khoản khác.
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Selector } from '@astryxdesign/core/Selector';
import { pixel, proportional } from '@astryxdesign/core/Table';
import DataTable from '../components/DataTable.jsx';
import { TextInput } from '@astryxdesign/core/TextInput';
import { changePassword, createUser, deleteUser, listUsers, updateUser } from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';
import { useDialog } from '../components/DialogContext.jsx';
import PasswordField from '../components/PasswordField.jsx';
import RowMenu from '../components/RowMenu.jsx';
import { ErrorBox } from '../components/StateMessage.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatDateTime } from '../constants.js';

const ROLE_OPTIONS = ['user', 'admin'];

// Khối đổi mật khẩu của chính mình
function ChangeOwnPassword() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [values, setValues] = useState({ old: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!values.old) found.old = 'Vui lòng nhập mật khẩu hiện tại';
    if (values.next.length < 8) found.next = 'Mật khẩu mới tối thiểu 8 ký tự';
    else if (values.next === values.old) found.next = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    if (values.confirm !== values.next) found.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await changePassword({ mat_khau_cu: values.old, mat_khau_moi: values.next });
      toast.success('Đã đổi mật khẩu');
      setValues({ old: '', next: '', confirm: '' });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label) => (
    <PasswordField
      label={label} htmlName={`mat_khau_${key}`} autoComplete={key === 'old' ? 'current-password' : 'new-password'}
      value={values[key]} onChange={(v) => { setValues({ ...values, [key]: v }); setErrors({}); }}
      status={errors[key] ? { type: 'error', message: errors[key] } : undefined}
    />
  );
  return (
    <div className="max-w-xl">
      <Card>
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          <Heading level={2}>Đổi mật khẩu của tôi</Heading>
          <input type="text" name="username" autoComplete="username" value={me.ten_dang_nhap} readOnly hidden />
          {field('old', 'Mật khẩu hiện tại')}
          {field('next', 'Mật khẩu mới')}
          {field('confirm', 'Nhập lại mật khẩu mới')}
          {errors.form && <Banner status="error" title={errors.form} />}
          <div><Button type="submit" variant="primary" label={saving ? 'Đang lưu...' : 'Đổi mật khẩu'} isDisabled={saving} /></div>
        </form>
      </Card>
    </div>
  );
}

// Khối quản lý tài khoản (admin)
function ManageUsers() {
  const toast = useToast();
  const dialog = useDialog();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ten_dang_nhap: '', mat_khau: '', vai_tro: 'user' });

  const load = useCallback(() => {
    listUsers().then((data) => { setUsers(data.items); setError(''); }).catch((err) => setError(err.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (action, message) => {
    try { await action(); if (message) toast.success(message); load(); return true; } catch (err) { toast.error(err.message); return false; }
  };

  const add = async (event) => {
    event.preventDefault();
    if (await run(() => createUser(form), 'Đã tạo tài khoản (người dùng sẽ phải đổi mật khẩu ở lần đăng nhập đầu)')) setForm({ ten_dang_nhap: '', mat_khau: '', vai_tro: 'user' });
  };

  // Đặt lại mật khẩu bằng hộp nhập của ứng dụng (admin đặt mật khẩu tạm tối thiểu 4 ký tự)
  const resetPassword = async (u) => {
    const password = await dialog.prompt({
      title: `Đặt lại mật khẩu cho ${u.ten_dang_nhap}`, inputLabel: 'Mật khẩu mới', inputType: 'password', confirmLabel: 'Đặt lại',
      validate: (v) => (v.length < 4 ? 'Mật khẩu tối thiểu 4 ký tự' : ''),
    });
    if (password) run(() => updateUser(u.id, { mat_khau: password }), 'Đã đặt lại mật khẩu');
  };

  const remove = async (u) => {
    const ok = await dialog.confirm({ title: 'Xóa tài khoản', message: `Xóa tài khoản "${u.ten_dang_nhap}"? Task của tài khoản này sẽ không còn PIC.`, confirmLabel: 'Xóa', danger: true });
    if (ok) run(() => deleteUser(u.id), 'Đã xóa tài khoản');
  };

  const columns = [
    {
      key: 'ten_dang_nhap', header: 'Tên đăng nhập', width: proportional(1, { minWidth: 260 }),
      renderCell: (u) => <span>{u.ten_dang_nhap}{u.bat_buoc_doi_mat_khau ? <span className="ml-2"><Badge variant="warning" label="chưa đổi mật khẩu" /></span> : null}</span>,
    },
    {
      key: 'vai_tro', header: 'Vai trò', width: pixel(160),
      renderCell: (u) => <Selector label={`Vai trò của ${u.ten_dang_nhap}`} isLabelHidden width={120} value={u.vai_tro} options={ROLE_OPTIONS} onChange={(v) => v && run(() => updateUser(u.id, { vai_tro: v }), 'Đã đổi vai trò')} />,
    },
    { key: 'tao_luc', header: 'Tạo lúc', width: pixel(190), renderCell: (u) => <span className="tabular-nums">{formatDateTime(u.tao_luc)}</span> },
    { key: 'so_phien', header: 'Số phiên', width: pixel(100), renderCell: (u) => <span className="tabular-nums">{u.so_phien}</span> },
    {
      key: 'thao_tac', header: '', width: pixel(80),
      renderCell: (u) => (
        <RowMenu items={[
          { label: 'Đặt lại mật khẩu', icon: 'key', onClick: () => resetPassword(u) },
          { label: 'Xóa tài khoản', icon: 'trash', danger: true, disabled: u.ten_dang_nhap === me.ten_dang_nhap, onClick: () => remove(u) },
        ]}
        />
      ),
    },
  ];

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <Heading level={2}>Quản lý tài khoản</Heading>
        <form onSubmit={add} noValidate className="flex flex-wrap items-end gap-3">
          <TextInput label="Tên đăng nhập" htmlName="ten_dang_nhap" autoComplete="off" value={form.ten_dang_nhap} onChange={(v) => setForm({ ...form, ten_dang_nhap: v })} />
          {/* Mật khẩu hiện chữ rõ vì admin cần đọc để đưa cho người dùng */}
          <TextInput label="Mật khẩu" htmlName="mat_khau" autoComplete="off" value={form.mat_khau} onChange={(v) => setForm({ ...form, mat_khau: v })} />
          <Selector label="Vai trò" width={120} value={form.vai_tro} options={ROLE_OPTIONS} onChange={(v) => setForm({ ...form, vai_tro: v ?? 'user' })} />
          <Button type="submit" variant="primary" label="Thêm tài khoản" />
        </form>
        <ErrorBox message={error} onRetry={load} />
        <DataTable minWidth={790} data={users} columns={columns} idKey="id" density="compact" />
      </div>
    </Card>
  );
}

export default function Accounts() {
  const { user } = useAuth();
  return (
    <div className="flex flex-col gap-4">
      <Heading level={1}>Tài khoản</Heading>
      <ChangeOwnPassword />
      {user.vai_tro === 'admin' && <ManageUsers />}
    </div>
  );
}
