// Trang "Cập nhật tiến độ": sửa nhiều task một lượt rồi lưu tất cả trong một transaction.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTasks, saveEod } from '../api.js';
import { useDialog } from '../components/DialogContext.jsx';
import Pagination from '../components/Pagination.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import { useStatuses } from '../components/StatusContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_SMALL, INPUT_CLASS, TABLE_BORDER_CLASS } from '../constants.js';
import { getReportStatus, REPORT_LEVEL_CLASS } from '../reportStatus.js';
import usePageSize from '../usePageSize.js';
import { notifyReportChanged } from '../useReportSummary.js';

export default function EndOfDay() {
  const toast = useToast();
  const dialog = useDialog();
  const { statuses, getStatus } = useStatuses();
  const [limit, changeLimit] = usePageSize();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [data, setData] = useState({ items: [], total: 0 });
  const [edits, setEdits] = useState({}); // task_id -> { tien_do, trang_thai, ghi_chu, noteEdited }
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const now = useMemo(() => new Date(), [data]);

  // Gõ tìm kiếm có chờ 300 ms
  useEffect(() => {
    const timer = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Tải danh sách task đang xử lý
  const load = useCallback(() => {
    setLoading(true);
    listTasks({ q, page, limit, notUpdated: onlyPending })
      .then((result) => { setData(result); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, page, limit, onlyPending]);
  useEffect(() => { load(); }, [load]);

  // Sửa một trường của một task
  const edit = (task, patch) => {
    setEdits((current) => ({
      ...current,
      [task.id]: { tien_do: String(task.tien_do), trang_thai: task.trang_thai, ghi_chu: task.ghi_chu, noteEdited: false, ...current[task.id], ...patch },
    }));
    setErrors((current) => ({ ...current, [task.id]: '' }));
  };

  // Gửi danh sách items lên server
  const send = async (items, message) => {
    setSaving(true);
    try {
      await saveEod(items);
      toast.success(message);
      setEdits({});
      setErrors({});
      notifyReportChanged();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // "Không đổi" cho một task: không gửi ghi chú
  const confirmOne = (task) => send([{ task_id: task.id, tien_do: task.tien_do, trang_thai: task.trang_thai }], 'Đã ghi nhận: không có gì thay đổi');

  // Task trên trang chưa cập nhật hôm nay và chưa sửa dở
  const untouched = data.items.filter((t) => !getReportStatus(t, now).updatedToday && !edits[t.id]);
  const confirmAll = async () => {
    const ok = await dialog.confirm({ title: 'Xác nhận không đổi', message: `Ghi nhận "không đổi" cho ${untouched.length} task trên trang này?`, confirmLabel: 'Xác nhận' });
    if (ok) send(untouched.map((t) => ({ task_id: t.id, tien_do: t.tien_do, trang_thai: t.trang_thai })), `Đã lưu ${untouched.length} task.`);
  };

  // Kiểm tra rồi lưu tất cả task đã sửa; ghi chú chỉ gửi khi người dùng sửa ô ghi chú
  const saveAll = () => {
    const ids = Object.keys(edits).map(Number);
    if (ids.length === 0) { toast.info('Chưa có thay đổi nào để lưu.'); return; }
    const found = {};
    const items = ids.map((id) => {
      const task = data.items.find((t) => t.id === id);
      const e = edits[id];
      const progress = Number(e.tien_do);
      if (e.tien_do === '' || !Number.isInteger(progress) || progress < 0 || progress > 100) found[id] = 'Tiến độ phải là số nguyên từ 0 đến 100';
      else if (getStatus(e.trang_thai)?.yeu_cau_hoan_tat && progress !== 100) found[id] = `${e.trang_thai} thì phải 100%`;
      const item = { task_id: id, tien_do: progress, trang_thai: e.trang_thai };
      if (e.noteEdited) item.ghi_chu = e.ghi_chu;
      return task ? item : null;
    }).filter(Boolean);
    setErrors(found);
    if (Object.keys(found).length > 0) { toast.error('Còn ô tiến độ chưa hợp lệ, hãy kiểm tra lại.'); return; }
    send(items, `Đã lưu ${items.length} task.`);
  };

  const editCount = Object.keys(edits).length;
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Cập nhật tiến độ</h1>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input className={`min-w-48 flex-1 sm:max-w-sm ${INPUT_CLASS}`} aria-label="Tìm task..." name="tim_task" placeholder="Tìm task..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="chi_chua_cap_nhat" checked={onlyPending} onChange={(e) => { setOnlyPending(e.target.checked); setPage(1); }} /> Chỉ task chưa cập nhật hôm nay</label>
        <div className="ml-auto flex items-center gap-3">
          {editCount > 0 && <span className="text-sm text-warning">{editCount} thay đổi chưa lưu</span>}
          <button type="button" className={BUTTON_SECONDARY} disabled={saving || untouched.length === 0} onClick={confirmAll}>Xác nhận không đổi ({untouched.length})</button>
          <button type="button" className={BUTTON_PRIMARY} disabled={saving} onClick={saveAll}>{saving ? 'Đang lưu...' : 'Lưu tất cả'}</button>
        </div>
      </div>
      <ErrorBox message={error} onRetry={load} />
      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className={`w-full min-w-[900px] text-sm ${TABLE_BORDER_CLASS}`}>
          <thead className="bg-surface-hover text-left">
            <tr><th className="px-3 py-1.5">Task</th><th className="px-3 py-1.5">Tiến độ (%)</th><th className="px-3 py-1.5">Trạng thái</th><th className="px-3 py-1.5">Ghi chú</th></tr>
          </thead>
          <tbody>
            {data.items.map((task) => {
              const e = edits[task.id];
              const rs = getReportStatus(task, now);
              const value = e ?? { tien_do: String(task.tien_do), trang_thai: task.trang_thai, ghi_chu: task.ghi_chu };
              return (
                <tr key={task.id}>
                  <td className="min-w-64 px-3 py-1.5 align-middle">
                    <div className="font-semibold">{task.ten}</div>
                    <div className="text-xs text-muted">{task.ma_task}</div>
                    <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${REPORT_LEVEL_CLASS[rs.level]}`}>{rs.label}</span>
                    {!rs.updatedToday && !e && <button type="button" className={`ml-2 ${BUTTON_SMALL}`} disabled={saving} onClick={() => confirmOne(task)}>Không đổi</button>}
                  </td>
                  <td className="px-3 py-1.5 align-middle">
                    <input aria-label={`Tiến độ của ${task.ten}`} name={`tien_do_${task.id}`} type="number" min="0" max="100" className={`w-24 ${INPUT_CLASS} ${errors[task.id] ? 'border-red-500' : ''}`} value={value.tien_do} onChange={(ev) => edit(task, { tien_do: ev.target.value })} />
                    {errors[task.id] && <p className="mt-1 text-xs text-error-text">{errors[task.id]}</p>}
                  </td>
                  <td className="px-3 py-1.5 align-middle">
                    <select aria-label={`Trạng thái của ${task.ten}`} name={`trang_thai_${task.id}`} className={INPUT_CLASS} value={value.trang_thai} onChange={(ev) => edit(task, { trang_thai: ev.target.value })}>
                      {statuses.map((s) => <option key={s.id} value={s.ten}>{s.ten}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-1.5 align-middle">
                    <textarea
                      aria-label={`Ghi chú của ${task.ten}`}
                      name={`ghi_chu_${task.id}`}
                      rows={1}
                      className={`w-full min-w-64 ${INPUT_CLASS} ${task.ghi_chu_rich ? 'cursor-not-allowed bg-surface-hover text-muted' : ''}`}
                      value={value.ghi_chu}
                      readOnly={task.ghi_chu_rich}
                      title={task.ghi_chu_rich ? 'Ghi chú có định dạng hoặc ảnh: sửa ở trang chi tiết task' : undefined}
                      onChange={(ev) => edit(task, { ghi_chu: ev.target.value, noteEdited: true })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loading && <Loading />}
      {!loading && data.items.length === 0 && <p className="py-4 text-sm text-muted">Không có task nào.</p>}
      <Pagination total={data.total} page={page} limit={limit} onChangePage={setPage} onChangeLimit={(v) => { changeLimit(v); setPage(1); }} />
    </div>
  );
}
