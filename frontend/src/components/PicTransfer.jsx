// Admin: chuyển PIC (chủ sở hữu) của task sang tài khoản khác.
import { useEffect, useState } from 'react';
import { listUsers, transferTask } from '../api.js';
import { BUTTON_SECONDARY, INPUT_CLASS } from '../constants.js';
import { useDialog } from './DialogContext.jsx';
import { useToast } from './Toast.jsx';

export default function PicTransfer({ task, onDone }) {
  const dialog = useDialog();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  // Tải danh sách tài khoản để chọn
  useEffect(() => { listUsers().then((data) => setUsers(data.items)).catch(() => setUsers([])); }, []);

  // Chuyển sau khi xác nhận
  const transfer = async () => {
    const user = users.find((u) => String(u.id) === target);
    if (!user) return;
    const ok = await dialog.confirm({ title: 'Chuyển PIC', message: `Chuyển task này cho "${user.ten_dang_nhap}"? PIC hiện tại sẽ mất quyền với task.`, confirmLabel: 'Chuyển' });
    if (!ok) return;
    setBusy(true);
    try {
      await transferTask(task.id, user.id);
      toast.success(`Đã chuyển task cho ${user.ten_dang_nhap}`);
      setTarget('');
      onDone();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>PIC: <b>{task.chu_so_huu ?? '(chưa có)'}</b></span>
      <select aria-label="Chuyển PIC cho" name="chu_so_huu_moi" className={INPUT_CLASS} value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">Chuyển cho...</option>
        {users.filter((u) => u.ten_dang_nhap !== task.chu_so_huu).map((u) => <option key={u.id} value={u.id}>{u.ten_dang_nhap}</option>)}
      </select>
      <button type="button" className={BUTTON_SECONDARY} disabled={!target || busy} onClick={transfer}>Chuyển</button>
    </div>
  );
}
