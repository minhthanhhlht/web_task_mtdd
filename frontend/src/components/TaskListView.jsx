// Danh sách task dùng cho "Đang xử lý" (archived=false) và "Đã hoàn thành" (archived=true).
import MenuIcon from './MenuIcon.jsx';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listTasks, saveEod } from '../api.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_SMALL, formatDateTime, INPUT_CLASS, TABLE_BORDER_CLASS } from '../constants.js';
import { getReportStatus, REPORT_LEVEL_CLASS } from '../reportStatus.js';
import usePageSize from '../usePageSize.js';
import useReportSummary, { notifyReportChanged } from '../useReportSummary.js';
import { useAuth } from './AuthContext.jsx';
import Pagination from './Pagination.jsx';
import TaskStats from './TaskStats.jsx';
import UserChip from './UserChip.jsx';
import ProgressBar from './ProgressBar.jsx';
import PwireLink from './PwireLink.jsx';
import { ErrorBox, Loading } from './StateMessage.jsx';
import StatusBadge from './StatusBadge.jsx';
import { useStatuses } from './StatusContext.jsx';
import { useToast } from './Toast.jsx';

// Đổi "2026-11-25 00:25:07" → "25/11/2026 00:25:07" (đủ ngày tháng năm, giờ phút giây nếu có)
function shortDateTime(value) {
  const text = String(value ?? '');
  return text.length >= 16 ? `${text.slice(8, 10)}/${text.slice(5, 7)}/${text.slice(0, 4)} ${text.slice(11, 19)}` : text;
}

// Màu hạn chót theo mức độ: quá hạn đỏ, hôm nay/ngày mai cam, còn lại giữ nguyên
function deadlineTone(deadline) {
  if (!deadline) return '';
  const day = String(deadline).slice(0, 10);
  const today = new Date();
  const key = (d) => d.toLocaleDateString('sv-SE');
  const tomorrow = new Date(today.getTime() + 86400000);
  if (day < key(today)) return 'font-medium text-error-strong';
  if (day <= key(tomorrow)) return 'font-medium text-warning';
  return '';
}

export default function TaskListView({ archived }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { activeStatuses } = useStatuses();
  const report = useReportSummary();
  const [limit, changeLimit] = usePageSize();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [notUpdated, setNotUpdated] = useState(false);
  const [sort, setSort] = useState({ key: '', dir: 'asc' });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const isAdmin = user.vai_tro === 'admin';

  // Chờ 300 ms sau khi gõ mới tìm, và quay về trang 1
  useEffect(() => {
    const timer = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Tải danh sách từ backend (lọc/tìm/sắp xếp/phân trang do backend làm)
  const load = useCallback(() => {
    setLoading(true);
    listTasks({ status, q, page, limit, archived, notUpdated, sort: sort.key, dir: sort.dir })
      .then((result) => { setData(result); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, q, page, limit, archived, notUpdated, sort]);
  useEffect(() => { load(); }, [load, reloadKey]);

  // Bấm tiêu đề cột: tăng → giảm → bỏ sắp xếp
  const toggleSort = (key) => {
    setPage(1);
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'asc' };
      return s.dir === 'asc' ? { key, dir: 'desc' } : { key: '', dir: 'asc' };
    });
  };
  const sortMark = (key) => <MenuIcon name={sort.key === key ? (sort.dir === 'asc' ? 'sort-up' : 'sort-down') : 'sort-none'} className="size-3.5" />;

  // "Không đổi": xác nhận không có gì thay đổi, không gửi ghi chú
  const confirmUnchanged = async (event, task) => {
    event.stopPropagation();
    try {
      await saveEod([{ task_id: task.id, tien_do: task.tien_do, trang_thai: task.trang_thai }]);
      toast.success('Đã ghi nhận: không có gì thay đổi ở tiến độ hôm nay');
      setReloadKey((k) => k + 1);
      notifyReportChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    ...(isAdmin ? [['chu_so_huu', 'PIC']] : []),
    ['ma_task', 'Số Pwire'], ['ten', 'Tên'], ['link_test_case', 'Link Pwire'], ['nguoi_giao', 'Người giao'], ['deadline', 'Deadline'],
    ['tien_do', 'Tiến độ'], ['trang_thai', 'Trạng thái'], ['checklist', 'Checklist'],
    ...(archived ? [] : [['cap_nhat', 'Cập nhật']]),
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{archived ? 'Đã hoàn thành' : 'Danh sách task đang xử lý'}</h1>
      {!archived && <TaskStats reportTotal={report.total} />}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input className={`min-w-44 flex-1 sm:max-w-sm ${INPUT_CLASS}`} aria-label="Tìm Số Pwire, tên..." name="tim_so_pwire_ten" placeholder="Tìm Số Pwire, tên..." title="Tìm theo số Pwire, tên, link, người giao, Dev, ghi chú, PIC" value={search} onChange={(e) => setSearch(e.target.value)} />
        {!archived && (
          <>
            <select aria-label="Lọc theo trạng thái" name="trang_thai" className={INPUT_CLASS} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Tất cả trạng thái</option>
              {activeStatuses.map((s) => <option key={s.id} value={s.ten}>{s.ten}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="chua_cap_nhat" checked={notUpdated} onChange={(e) => { setNotUpdated(e.target.checked); setPage(1); }} /> Chưa cập nhật hôm nay
            </label>
            <Link to="/tasks/new" className={`ml-auto ${BUTTON_PRIMARY}`}>Thêm task</Link>
          </>
        )}
      </div>

      {!archived && report.total > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">
          <span>
            {report.afterCutoff ? `Có ${report.total} task chưa cập nhật tiến độ hôm nay` : `Còn ${report.total} task chưa cập nhật tiến độ (chốt lúc 16:30)`}
            {report.missed > 0 ? `, trong đó ${report.missed} task đã bỏ sót từ các ngày trước` : ''}
          </span>
          <Link to="/cuoi-chieu" className={BUTTON_SECONDARY}>Cập nhật ngay</Link>
        </div>
      )}

      <ErrorBox message={error} onRetry={load} />
      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className={`w-full text-sm ${TABLE_BORDER_CLASS}`}>
          <thead className="bg-surface-hover text-left">
            <tr>
              {columns.map(([key, label]) => (
                <th key={key} className="whitespace-nowrap px-1.5 py-1">
                  <button type="button" className="inline-flex h-8 items-center gap-1 font-medium hover:text-foreground" onClick={() => toggleSort(key)}>{label}<span className="text-muted">{sortMark(key)}</span></button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((task) => {
              const rs = getReportStatus(task, report.now);
              return (
                <tr key={task.id} className="cursor-pointer align-middle hover:bg-surface-hover" onClick={() => navigate(`/tasks/${task.id}`)}>
                  {isAdmin && <td className="whitespace-nowrap px-1.5 py-1.5">{task.chu_so_huu ? <UserChip name={task.chu_so_huu} /> : '—'}</td>}
                  <td className="whitespace-nowrap px-1.5 py-1.5">{task.ma_task}</td>
                  <td className="max-w-40 truncate px-1.5 py-1.5" title={task.ten}>{task.ten}</td>
                  <td className="px-1.5 py-1.5"><PwireLink url={task.link_test_case} compact /></td>
                  <td className="max-w-20 truncate px-1.5 py-1.5" title={task.nguoi_giao}>{task.nguoi_giao}</td>
                  <td className={`whitespace-nowrap px-1.5 py-1.5 tabular-nums ${archived ? '' : deadlineTone(task.deadline)}`} title={task.deadline ?? undefined}>{task.deadline ? shortDateTime(task.deadline) : '—'}</td>
                  <td className="whitespace-nowrap px-1.5 py-1.5"><ProgressBar value={task.tien_do} /></td>
                  <td className="px-1.5 py-1.5"><StatusBadge name={task.trang_thai} /></td>
                  <td className={`whitespace-nowrap px-1.5 py-1.5 tabular-nums ${task.checklist_tong > 0 && task.checklist_da_xong === task.checklist_tong ? 'font-medium text-success' : ''}`}>{task.checklist_da_xong}/{task.checklist_tong}</td>
                  {!archived && (
                    <td className="whitespace-nowrap px-1.5 py-1.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${REPORT_LEVEL_CLASS[rs.level]}`}>
                        {rs.updatedToday ? shortDateTime(rs.updatedAtFull ?? task.ngay_cap_nhat_cuoi) : rs.level === 'pending' ? 'Chưa cập nhật' : rs.label}
                      </span>
                      {!rs.updatedToday && <button type="button" className={`ml-2 ${BUTTON_SMALL}`} onClick={(e) => confirmUnchanged(e, task)}>Không đổi</button>}
                    </td>
                  )}
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
