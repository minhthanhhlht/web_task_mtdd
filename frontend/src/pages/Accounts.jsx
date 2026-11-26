// Trang tài khoản: đổi mật khẩu của mình; admin quản lý thêm các tài khoản khác.
import RowMenu from '../components/RowMenu.jsx';
import { useCallback, useEffect, useState } from 'react';
import { changePassword, createUser, deleteUser, listUsers, updateUser } from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';
import { useDialog } from '../components/DialogContext.jsx';
import FieldError from '../components/FieldError.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { ErrorBox } from '../components/StateMessage.jsx';
import { useToast } from '../components/Toast.jsx';
import { BUTTON_DANGER, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD_CLASS, formatDateTime, INPUT_CLASS, TABLE_BORDER_CLASS } from '../constants.js';

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
    <div>
      <label htmlFor={`own-${key}`} className="mb-1 block text-sm">{label}</label>
      <PasswordInput id={`own-${key}`} name={`mat_khau_${key}`} autoComplete={key === 'old' ? 'current-password' : 'new-password'} className={`w-full ${INPUT_CLASS} ${errors[key] ? 'border-red-500' : ''}`} value={values[key]} onChange={(e) => { setValues({ ...values, [key]: e.target.value }); setErrors({}); }} />
      <FieldError message={errors[key]} />
    </div>
  );
  return (
    <form onSubmit={submit} noValidate className={`${CARD_CLASS} max-w-xl space-y-3`}>
      <h2 className="text-lg font-semibold">Đổi mật khẩu của tôi</h2>
      <input type="text" name="username" autoComplete="username" value={me.ten_dang_nhap} readOnly hidden />
      {field('old', 'Mật khẩu hiện tại')}
      {field('next', 'Mật khẩu mới')}
      {field('confirm', 'Nhập lại mật khẩu mới')}
      {errors.form && <p className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">{errors.form}</p>}
      <button type="submit" className={BUTTON_PRIMARY} disabled={saving}>{saving ? 'Đang lưu...' : 'Đổi mật khẩu'}</button>
    </form>
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

  // Đặt lại mật khẩu bằng hộp nhập của ứng dụng
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

  return (
    <div className={`${CARD_CLASS} space-y-3`}>
      <h2 className="text-lg font-semibold">Quản lý tài khoản</h2>
      <form onSubmit={add} noValidate className="flex flex-wrap items-end gap-3">
        <div><label htmlFor="new-user-name" className="mb-1 block text-sm">Tên đăng nhập</label><input id="new-user-name" name="ten_dang_nhap" autoComplete="off" className={INPUT_CLASS} value={form.ten_dang_nhap} onChange={(e) => setForm({ ...form, ten_dang_nhap: e.target.value })} /></div>
        <div><label htmlFor="new-user-password" className="mb-1 block text-sm">Mật khẩu</label><input id="new-user-password" name="mat_khau" autoComplete="off" type="text" className={INPUT_CLASS} value={form.mat_khau} onChange={(e) => setForm({ ...form, mat_khau: e.target.value })} /></div>
        <div>
          <label htmlFor="new-user-role" className="mb-1 block text-sm">Vai trò</label>
          <select id="new-user-role" name="vai_tro" className={INPUT_CLASS} value={form.vai_tro} onChange={(e) => setForm({ ...form, vai_tro: e.target.value })}><option value="user">user</option><option value="admin">admin</option></select>
        </div>
        <button type="submit" className={BUTTON_PRIMARY}>Thêm tài khoản</button>
      </form>
      <ErrorBox message={error} onRetry={load} />
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${TABLE_BORDER_CLASS}`}>
          <thead className="bg-surface-hover text-left"><tr><th className="px-3 py-1.5">Tên đăng nhập</th><th className="px-3 py-1.5">Vai trò</th><th className="px-3 py-1.5">Tạo lúc</th><th className="px-3 py-1.5">Số phiên</th><th className="px-3 py-1.5" /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-1.5">{u.ten_dang_nhap}{u.bat_buoc_doi_mat_khau ? <span className="ml-2 text-xs text-warning">(chưa đổi mật khẩu)</span> : null}</td>
                <td className="px-3 py-1.5">
                  <select aria-label={`Vai trò của ${u.ten_dang_nhap}`} name={`vai_tro_${u.id}`} className={INPUT_CLASS} value={u.vai_tro} onChange={(e) => run(() => updateUser(u.id, { vai_tro: e.target.value }), 'Đã đổi vai trò')}><option value="user">user</option><option value="admin">admin</option></select>
                </td>
                <td className="px-3 py-1.5">{formatDateTime(u.tao_luc)}</td>
                <td className="px-3 py-1.5">{u.so_phien}</td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <RowMenu items={[{ label: 'Đặt lại mật khẩu', icon: 'key', onClick: () => resetPassword(u) }, { label: 'Xóa tài khoản', icon: 'trash', danger: true, disabled: u.ten_dang_nhap === me.ten_dang_nhap, title: u.ten_dang_nhap === me.ten_dang_nhap ? 'Không thể tự xóa tài khoản đang đăng nhập' : undefined, onClick: () => remove(u) }]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tài khoản</h1>
      <ChangeOwnPassword />
      {user.vai_tro === 'admin' && <ManageUsers />}
    </div>
  );
}
