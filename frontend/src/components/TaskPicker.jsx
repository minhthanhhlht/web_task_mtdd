// Chọn nhiều task (có tìm kiếm, phân trang cố định PAGE_SIZE) cho chức năng "Áp dụng mẫu".
import { useEffect, useState } from 'react';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { listTasks } from '../api.js';
import { PAGE_SIZE } from '../constants.js';
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
    <div className="flex flex-col gap-2">
      <TextInput label="Tìm task..." isLabelHidden placeholder="Tìm task..." startIcon="search" hasClear value={search} onChange={setSearch} htmlName="tim_task" />
      <ErrorBox message={error} />
      {loading && <Loading />}
      <div className="flex max-h-72 flex-col gap-1 overflow-auto rounded-lg border border-(--color-border) p-2">
        {data.items.map((task) => (
          <CheckboxInput key={task.id} label={`${task.ma_task} ${task.ten}`} value={selected.includes(task.id)} onChange={() => toggle(task.id)} />
        ))}
      </div>
      <Text type="supporting" color="secondary">Đã chọn {selected.length} task</Text>
      <Pagination total={data.total} page={page} limit={PAGE_SIZE} onChangePage={setPage} />
    </div>
  );
}
