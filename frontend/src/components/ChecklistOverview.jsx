// Tổng hợp checklist theo task: tick từng mục, chọn tất cả từng task, lọc, tìm, phân trang.
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Link } from '@astryxdesign/core/Link';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { listChecklists, setAllChecklist, setChecklistItem } from '../api.js';
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 sm:max-w-sm">
          <TextInput label="Tìm task..." isLabelHidden placeholder="Tìm task..." startIcon="search" hasClear value={search} onChange={setSearch} htmlName="tim_task" />
        </div>
        {!archived && (
          <Selector
            label="Lọc theo trạng thái" isLabelHidden width={220} value={status}
            options={[{ value: '', label: 'Tất cả trạng thái' }, ...activeStatuses.map((s) => ({ value: s.ten, label: s.ten }))]}
            onChange={(v) => { setStatus(v ?? ''); setPage(1); }}
          />
        )}
        <Selector
          label="Danh sách" isLabelHidden width={180} value={archived ? '1' : '0'}
          options={[{ value: '0', label: 'Đang xử lý' }, { value: '1', label: 'Đã hoàn thành' }]}
          onChange={(v) => { setArchived(v === '1'); setStatus(''); setPage(1); }}
        />
      </div>
      <ErrorBox message={error} onRetry={load} />
      {loading && <Loading />}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {data.items.map((task) => {
          const done = task.checklist_items.filter((i) => i.da_xong).length;
          const total = task.checklist_items.length;
          return (
            <Card key={task.id}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/tasks/${task.id}`}>{task.ma_task} · {task.ten}</Link>
                  <Text color="secondary"><span className="tabular-nums">{done}/{total}</span></Text>
                </div>
                <SelectAllCheckbox checked={total > 0 && done === total} indeterminate={done > 0 && done < total} disabled={total === 0} onChange={(checked) => run(() => setAllChecklist(task.id, checked))} />
                {task.checklist_items.map((item) => <ChecklistBox key={item.id} item={item} onToggle={(it, value) => run(() => setChecklistItem(it.id, value))} />)}
              </div>
            </Card>
          );
        })}
      </div>
      {!loading && data.items.length === 0 && <EmptyState title="Không có task nào." isCompact />}
      <Pagination total={data.total} page={page} limit={limit} onChangePage={setPage} onChangeLimit={(v) => { changeLimit(v); setPage(1); }} />
    </div>
  );
}
