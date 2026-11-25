// Trang "Task đã xóa" (chỉ admin): danh sách task xóa mềm và nút Khôi phục.
import { useCallback, useEffect, useState } from 'react';
import { listDeletedTasks, purgeDeletedTask, restoreDeletedTask } from '../api.js';
import { useDialog } from '../components/DialogContext.jsx';
import MenuIcon from '../components/MenuIcon.jsx';
import Pagination from '../components/Pagination.jsx';
import RowMenu from '../components/RowMenu.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import UserChip from '../components/UserChip.jsx';
import { BUTTON_SMALL, formatDateTime, INPUT_CLASS, TABLE_BORDER_CLASS } from '../constants.js';
import usePageSize from '../usePageSize.js';

// Cột bảng: [khóa sắp xếp, nhãn]
const COLUMNS = [['chu_so_huu', 'PIC'], ['ma_task', 'Số Pwire'], ['ten', 'Tên'], ['trang_thai', 'Trạng thái'], ['tien_do', 'Tiến độ'], ['xoa_luc', 'Xóa lúc'], ['nguoi_xoa', 'Người xóa']];

export default function DeletedTasks() {
  const toast = useToast();
  const dialog = useDialog();
  const [limit, changeLimit] = usePageSize();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'xoa_luc', dir: 'desc' });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Chờ 300 ms sau khi gõ mới tìm, và quay về trang 1
  useEffect(() => {
    const timer = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Tải danh sách task đã xóa từ backend (tìm/sắp xếp/phân trang do backend làm)
  const load = useCallback(() => {
    setLoading(true);
    listDeletedTasks({ q, page, limit, sort: sort.key, dir: sort.dir })
      .then((result) => { setData(result); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, page, limit, sort]);
  useEffect(() => { load(); }, [load]);

  // Bấm tiêu đề cột: đổi chiều nếu đang sắp theo cột đó, không thì sắp tăng
  const toggleSort = (key) => {
    setPage(1);
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };
  const sortMark = (key) => <MenuIcon name={sort.key === key ? (sort.dir === 'asc' ? 'sort-up' : 'sort-down') : 'sort-none'} className="size-3.5" />;

  // Khôi phục một task sau khi xác nhận
  const restore = async (task) => {
    const ok = await dialog.confirm({ title: 'Khôi phục task', message: `Khôi phục task ${task.ma_task} - ${task.ten}? Task sẽ quay lại danh sách của PIC với đầy đủ dữ liệu cũ.`, confirmLabel: 'Khôi phục' });
    if (!ok) return;
    setBusyId(task.id);
    try {
      await restoreDeletedTask(task.id);
      toast.success(`Đã khôi phục task ${task.ma_task}`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  // Xóa vĩnh viễn một task sau khi xác nhận (không hoàn tác được)
  const purge = async (task) => {
    const ok = await dialog.confirm({ title: 'Xóa vĩnh viễn task', message: `Xóa vĩnh viễn task ${task.ma_task} - ${task.ten}? Toàn bộ checklist, vấn đề, tiến độ và lịch sử của task cũng bị xóa. Không thể hoàn tác.`, confirmLabel: 'Xóa vĩnh viễn', danger: true });
    if (!ok) return;
    setBusyId(task.id);
    try {
      await purgeDeletedTask(task.id);
      toast.success(`Đã xóa vĩnh viễn task ${task.ma_task}`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Task đã xóa</h1>
      <p className="mb-4 text-sm text-muted">Task bị xóa vẫn được giữ lại. Chỉ quản trị viên khôi phục hoặc xóa vĩnh viễn được.</p>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input className={`min-w-44 flex-1 sm:max-w-sm ${INPUT_CLASS}`} aria-label="Tìm Số Pwire, tên..." name="tim_task_da_xoa" placeholder="Tìm Số Pwire, tên..." title="Tìm theo số Pwire, tên, link, người giao, Dev, ghi chú, PIC" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <ErrorBox message={error} onRetry={load} />
      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className={`w-full text-sm ${TABLE_BORDER_CLASS}`}>
          <thead className="bg-surface-hover text-left">
            <tr>
              {COLUMNS.map(([key, label]) => (
                <th key={key} className="whitespace-nowrap px-1.5 py-1">
                  <button type="button" className="inline-flex h-8 items-center gap-1 font-medium hover:text-foreground" onClick={() => toggleSort(key)}>{label}<span className="text-muted">{sortMark(key)}</span></button>
                </th>
              ))}
              <th className="px-1.5 py-1"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((task) => (
              <tr key={task.id} className="align-middle hover:bg-surface-hover">
                <td className="whitespace-nowrap px-1.5 py-1.5">{task.chu_so_huu ? <UserChip name={task.chu_so_huu} /> : '—'}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5">{task.ma_task}</td>
                <td className="max-w-64 truncate px-1.5 py-1.5" title={task.ten}>{task.ten}</td>
                <td className="px-1.5 py-1.5"><StatusBadge name={task.trang_thai} /></td>
                <td className="whitespace-nowrap px-1.5 py-1.5"><ProgressBar value={task.tien_do} /></td>
                <td className="whitespace-nowrap px-1.5 py-1.5 tabular-nums">{formatDateTime(task.xoa_luc)}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5">{task.nguoi_xoa ? <UserChip name={task.nguoi_xoa} /> : '—'}</td>
                <td className="whitespace-nowrap px-1.5 py-1.5">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" className={BUTTON_SMALL} disabled={busyId === task.id} onClick={() => restore(task)}>Khôi phục</button>
                    <RowMenu items={[{ label: 'Xóa vĩnh viễn', icon: 'trash', danger: true, disabled: busyId === task.id, onClick: () => purge(task) }]} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <Loading />}
      {!loading && data.items.length === 0 && <p className="py-4 text-sm text-muted">{q ? 'Không có task đã xóa nào khớp.' : 'Chưa có task nào bị xóa.'}</p>}
      <Pagination total={data.total} page={page} limit={limit} onChangePage={setPage} onChangeLimit={(v) => { changeLimit(v); setPage(1); }} />
    </div>
  );
}
