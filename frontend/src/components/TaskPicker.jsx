// Chọn nhiều task (có tìm kiếm, phân trang cố định 50) cho chức năng "Áp dụng mẫu".
import { useEffect, useState } from 'react';
import { listTasks } from '../api.js';
import { INPUT_CLASS, PAGE_SIZE } from '../constants.js';
import Pagination from './Pagination.jsx';
import { ErrorBox, Loading } from './StateMessage.jsx';

export default function TaskPicker({ selected, onChange }) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    listTasks({ q, page, limit: PAGE_SIZE })
      .then((result) => { setData(result); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, page]);

  // Tick / bỏ tick một task
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div>
      <input className={`w-full ${INPUT_CLASS}`} aria-label="Tìm task..." name="tim_task" placeholder="Tìm task..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <ErrorBox message={error} />
      {loading && <Loading />}
      <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-border-strong">
        {data.items.map((task) => (
          <label key={task.id} className="flex items-center gap-2 border-b border-border px-2 py-1 text-sm hover:bg-surface-hover">
            <input type="checkbox" checked={selected.includes(task.id)} onChange={() => toggle(task.id)} />
            <span className="text-muted">{task.ma_task}</span> {task.ten}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Đã chọn {selected.length} task</p>
      <Pagination total={data.total} page={page} limit={PAGE_SIZE} onChangePage={setPage} />
    </div>
  );
}
