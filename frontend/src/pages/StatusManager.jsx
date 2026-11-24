// Trang quản lý trạng thái task (admin): thêm, sửa tên/màu/cờ, đổi thứ tự, xóa.
import RowMenu from '../components/RowMenu.jsx';
import MenuIcon from '../components/MenuIcon.jsx';
import { useState } from 'react';
import { createStatus, deleteStatus, moveStatus, updateStatus } from '../api.js';
import { useDialog } from '../components/DialogContext.jsx';
import Pagination from '../components/Pagination.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useStatuses } from '../components/StatusContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { BUTTON_ICON, BUTTON_PRIMARY, CARD_CLASS, INPUT_CLASS, STATUS_COLOR_OPTIONS, TABLE_BORDER_CLASS, PAGE_SIZE } from '../constants.js';

// Một dòng trạng thái: tên sửa tại chỗ (rời ô/Enter lưu, Esc hủy)
function StatusRow({ status, index, count, onChange, onMove, onDelete }) {
  const dialog = useDialog();
  const [name, setName] = useState(status.ten);

  // Lưu tên mới; nếu đang có task dùng thì hỏi xác nhận
  const commitName = async () => {
    const next = name.trim();
    if (!next || next === status.ten) { setName(status.ten); return; }
    if (status.so_task > 0) {
      const ok = await dialog.confirm({ title: 'Đổi tên trạng thái', message: `Có ${status.so_task} task đang dùng "${status.ten}". Các task này sẽ đổi sang "${next}". Tiếp tục?`, confirmLabel: 'Đổi tên' });
      if (!ok) { setName(status.ten); return; }
    }
    if (!(await onChange(status, { ten: next }))) setName(status.ten);
  };

  return (
    <tr>
      <td className="px-3 py-1.5">{index + 1}</td>
      <td className="px-3 py-1.5">
        <input
          aria-label={`Tên trạng thái ${status.ten}`} name={`ten_${status.id}`} className={`w-56 ${INPUT_CLASS}`} value={name} onChange={(e) => setName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setName(status.ten); e.target.blur(); } }}
        />
      </td>
      <td className="px-3 py-1.5">
        <select aria-label={`Màu của ${status.ten}`} name={`mau_${status.id}`} className={INPUT_CLASS} value={status.mau} onChange={(e) => onChange(status, { mau: e.target.value })}>
          {Object.entries(STATUS_COLOR_OPTIONS).map(([key, opt]) => <option key={key} value={key}>{opt.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-1.5"><StatusBadge name={status.ten} color={status.mau} /></td>
      <td className="px-3 py-1.5 text-center"><input type="checkbox" aria-label={`${status.ten} là trạng thái hoàn thành`} name={`hoan_thanh_${status.id}`} checked={Boolean(status.la_hoan_thanh)} onChange={(e) => onChange(status, { la_hoan_thanh: e.target.checked })} /></td>
      <td className="px-3 py-1.5 text-center"><input type="checkbox" aria-label={`${status.ten} yêu cầu 100% và checklist`} name={`yeu_cau_${status.id}`} checked={Boolean(status.yeu_cau_hoan_tat)} onChange={(e) => onChange(status, { yeu_cau_hoan_tat: e.target.checked })} /></td>
      <td className="px-3 py-1.5">{status.so_task}</td>
      <td className="whitespace-nowrap px-3 py-1.5">
        <button type="button" className={BUTTON_ICON} disabled={index === 0} onClick={() => onMove(status, -1)} aria-label="Lên"><MenuIcon name="arrow-up" className="size-4" /></button>{' '}
        <button type="button" className={BUTTON_ICON} disabled={index === count - 1} onClick={() => onMove(status, 1)} aria-label="Xuống"><MenuIcon name="arrow-down" className="size-4" /></button>
        <RowMenu items={[{ label: 'Xóa', icon: 'trash', danger: true, disabled: status.so_task > 0, title: status.so_task > 0 ? `Đang có ${status.so_task} task dùng` : undefined, onClick: () => onDelete(status) }]} />
      </td>
    </tr>
  );
}

export default function StatusManager() {
  const toast = useToast();
  const dialog = useDialog();
  const { statuses, reload, loading, error } = useStatuses();
  const [form, setForm] = useState({ ten: '', mau: 'gray', la_hoan_thanh: false, yeu_cau_hoan_tat: false });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Chạy thao tác, báo lỗi toast, tải lại danh sách trạng thái; trả true nếu thành công
  const run = async (action, message) => {
    try {
      await action();
      if (message) toast.success(message);
      await reload();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const add = async (event) => {
    event.preventDefault();
    if (!form.ten.trim()) { toast.error('Vui lòng nhập tên trạng thái'); return; }
    if (await run(() => createStatus({ ...form, ten: form.ten.trim() }), 'Đã thêm trạng thái')) setForm({ ten: '', mau: 'gray', la_hoan_thanh: false, yeu_cau_hoan_tat: false });
  };

  const remove = async (status) => {
    const ok = await dialog.confirm({ title: 'Xóa trạng thái', message: `Xóa trạng thái "${status.ten}"?`, confirmLabel: 'Xóa', danger: true });
    if (ok) run(() => deleteStatus(status.id), 'Đã xóa trạng thái');
  };

  const pageItems = statuses.slice((page - 1) * limit, page * limit);
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Quản lý trạng thái</h1>
      <form onSubmit={add} noValidate className={`${CARD_CLASS} mb-4 flex flex-wrap items-end gap-3`}>
        <div><label htmlFor="new-status-name" className="mb-1 block text-sm">Tên trạng thái</label><input id="new-status-name" name="ten" className={INPUT_CLASS} value={form.ten} onChange={(e) => setForm({ ...form, ten: e.target.value })} /></div>
        <div>
          <label htmlFor="new-status-color" className="mb-1 block text-sm">Màu</label>
          <select id="new-status-color" name="mau" className={INPUT_CLASS} value={form.mau} onChange={(e) => setForm({ ...form, mau: e.target.value })}>
            {Object.entries(STATUS_COLOR_OPTIONS).map(([key, opt]) => <option key={key} value={key}>{opt.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="la_hoan_thanh" checked={form.la_hoan_thanh} onChange={(e) => setForm({ ...form, la_hoan_thanh: e.target.checked })} /> Hoàn thành</label>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="yeu_cau_hoan_tat" checked={form.yeu_cau_hoan_tat} onChange={(e) => setForm({ ...form, yeu_cau_hoan_tat: e.target.checked })} /> Yêu cầu 100% + checklist</label>
        <div className="text-sm"><span className="mb-1 block">Xem trước</span>{form.ten.trim() ? <StatusBadge name={form.ten.trim()} color={form.mau} /> : <span className="text-muted">—</span>}</div>
        <button type="submit" className={BUTTON_PRIMARY}>Thêm</button>
      </form>
      <ErrorBox message={error} onRetry={reload} />
      {loading && <Loading />}
      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className={`w-full text-sm ${TABLE_BORDER_CLASS}`}>
          <thead className="bg-surface-hover text-left">
            <tr>
              <th className="px-3 py-1.5">#</th><th className="px-3 py-1.5">Tên trạng thái</th><th className="px-3 py-1.5">Màu</th><th className="px-3 py-1.5">Xem trước</th>
              <th className="px-3 py-1.5">Hoàn thành</th><th className="px-3 py-1.5">Yêu cầu 100% + checklist</th><th className="px-3 py-1.5">Số task</th><th className="px-3 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((status, i) => (
              <StatusRow
                key={`${status.id}-${status.ten}`} status={status} index={(page - 1) * limit + i} count={statuses.length}
                onChange={(s, patch) => run(() => updateStatus(s.id, patch))}
                onMove={(s, dir) => run(() => moveStatus(s.id, dir))}
                onDelete={remove}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={statuses.length} page={page} limit={limit} unit="trạng thái" onChangePage={setPage} onChangeLimit={(v) => { setLimit(v); setPage(1); }} />
    </div>
  );
}
