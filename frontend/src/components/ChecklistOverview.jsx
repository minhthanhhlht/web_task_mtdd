// Tổng hợp checklist theo task: tick từng mục, chọn tất cả từng task, lọc, tìm, phân trang.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChecklists, setAllChecklist, setChecklistItem } from '../api.js';
import { INPUT_CLASS } from '../constants.js';
import usePageSize from '../usePageSize.js';
import ChecklistBox from './ChecklistBox.jsx';
import Pagination from './Pagination.jsx';
import SelectAllCheckbox from './SelectAllCheckbox.jsx';
import { ErrorBox, Loading } from './StateMessage.jsx';
import { useStatuses } from './StatusContext.jsx';
import { useToast } from './Toast.jsx';

export default function ChecklistOverview() {
  const toast = useToast();
  const { activeStatuses } = useStatuses();
  const [limit, changeLimit] = usePageSize();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [archived, setArchived] = useState(false);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    listChecklists({ status, q, page, limit, archived })
      .then((result) => { setData(result); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, q, page, limit, archived]);
  useEffect(() => { load(); }, [load]);

  // Chạy thao tác tick rồi tải lại
  const run = async (action) => {
    try { await action(); await load(); } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input className={`min-w-48 flex-1 sm:max-w-sm ${INPUT_CLASS}`} aria-label="Tìm task..." name="tim_task" placeholder="Tìm task..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {!archived && (
          <select aria-label="Lọc theo trạng thái" name="trang_thai" className={INPUT_CLASS} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tất cả trạng thái</option>
            {activeStatuses.map((s) => <option key={s.id} value={s.ten}>{s.ten}</option>)}
          </select>
        )}
        <select aria-label="Danh sách" name="archived" className={INPUT_CLASS} value={archived ? '1' : '0'} onChange={(e) => { setArchived(e.target.value === '1'); setStatus(''); setPage(1); }}>
          <option value="0">Đang xử lý</option>
          <option value="1">Đã hoàn thành</option>
        </select>
      </div>
      <ErrorBox message={error} onRetry={load} />
      {loading && <Loading />}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.items.map((task) => {
          const done = task.checklist_items.filter((i) => i.da_xong).length;
          const total = task.checklist_items.length;
          return (
            <div key={task.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Link to={`/tasks/${task.id}`} className="font-semibold text-primary hover:underline">{task.ma_task} · {task.ten}</Link>
                <span className="text-sm text-muted">{done}/{total}</span>
              </div>
              <SelectAllCheckbox checked={total > 0 && done === total} indeterminate={done > 0 && done < total} disabled={total === 0} onChange={(checked) => run(() => setAllChecklist(task.id, checked))} />
              {task.checklist_items.map((item) => <ChecklistBox key={item.id} item={item} onToggle={(it, value) => run(() => setChecklistItem(it.id, value))} />)}
            </div>
          );
        })}
      </div>
      {!loading && data.items.length === 0 && <p className="py-4 text-sm text-muted">Không có task nào.</p>}
      <Pagination total={data.total} page={page} limit={limit} onChangePage={setPage} onChangeLimit={(v) => { changeLimit(v); setPage(1); }} />
    </div>
  );
}
