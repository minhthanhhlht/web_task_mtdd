// Trang "Task đã xóa" (chỉ admin): danh sách task xóa mềm, nút Khôi phục và Xóa vĩnh viễn.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { pixel, proportional, useTableSortable } from '@astryxdesign/core/Table';
import DataTable from '../components/DataTable.jsx';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { listDeletedTasks, purgeDeletedTask, restoreDeletedTask } from '../api.js';
import { useDialog } from '../components/DialogContext.jsx';
import Pagination from '../components/Pagination.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import RowMenu from '../components/RowMenu.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import UserChip from '../components/UserChip.jsx';
import { formatDateTime } from '../constants.js';
import usePageSize from '../usePageSize.js';

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

  const sortPlugin = useTableSortable({
    sort: sort.key ? [{ sortKey: sort.key, direction: sort.dir === 'asc' ? 'ascending' : 'descending' }] : [],
    onSortChange: (next) => {
      setPage(1);
      setSort(next.length ? { key: next[0].sortKey, dir: next[0].direction === 'ascending' ? 'asc' : 'desc' } : { key: 'xoa_luc', dir: 'desc' });
    },
  });

  // Khôi phục một task sau khi xác nhận
  const restore = useCallback(async (task) => {
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
  }, [dialog, toast, load]);

  // Xóa vĩnh viễn một task sau khi xác nhận (không hoàn tác được)
  const purge = useCallback(async (task) => {
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
  }, [dialog, toast, load]);

  const columns = useMemo(() => [
    { key: 'chu_so_huu', header: 'PIC', width: pixel(130), sortable: true, renderCell: (t) => (t.chu_so_huu ? <UserChip name={t.chu_so_huu} /> : '—') },
    { key: 'ma_task', header: 'Số Pwire', width: pixel(170), sortable: true, renderCell: (t) => <span className="whitespace-nowrap">{t.ma_task}</span> },
    { key: 'ten', header: 'Tên', width: proportional(3, { minWidth: 150 }), sortable: true, renderCell: (t) => <span className="block truncate" title={t.ten}>{t.ten}</span> },
    { key: 'trang_thai', header: 'Trạng thái', width: pixel(190), sortable: true, renderCell: (t) => <StatusBadge name={t.trang_thai} /> },
    { key: 'tien_do', header: 'Tiến độ', width: pixel(150), sortable: true, renderCell: (t) => <ProgressBar value={t.tien_do} /> },
    { key: 'xoa_luc', header: 'Xóa lúc', width: pixel(190), sortable: true, renderCell: (t) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(t.xoa_luc)}</span> },
    { key: 'nguoi_xoa', header: 'Người xóa', width: pixel(130), sortable: true, renderCell: (t) => (t.nguoi_xoa ? <UserChip name={t.nguoi_xoa} /> : '—') },
    {
      key: 'thao_tac', header: '', width: pixel(160),
      renderCell: (t) => (
        <span className="inline-flex items-center gap-1">
          <Button label="Khôi phục" size="sm" isDisabled={busyId === t.id} onClick={() => restore(t)} />
          <RowMenu items={[{ label: 'Xóa vĩnh viễn', icon: 'trash', danger: true, disabled: busyId === t.id, onClick: () => purge(t) }]} />
        </span>
      ),
    },
  ], [busyId, restore, purge]);

  return (
    <div className="flex flex-col gap-3">
      <Heading level={1}>Task đã xóa</Heading>
      <Text color="secondary">Task bị xóa vẫn được giữ lại. Chỉ quản trị viên khôi phục hoặc xóa vĩnh viễn được.</Text>
      <div className="min-w-48 sm:max-w-sm">
        <TextInput label="Tìm Số Pwire, tên..." isLabelHidden placeholder="Tìm Số Pwire, tên..." startIcon="search" hasClear value={search} onChange={setSearch} htmlName="tim_task_da_xoa" />
      </div>
      <ErrorBox message={error} onRetry={load} />
      <DataTable
        minWidth={1270}
        data={data.items} columns={columns} idKey="id" density="compact" hasHover plugins={{ sort: sortPlugin }}
        emptyState={loading ? false : <EmptyState title={q ? 'Không có task đã xóa nào khớp.' : 'Chưa có task nào bị xóa.'} isCompact />}
      />
      {loading && <Loading />}
      <Pagination total={data.total} page={page} limit={limit} onChangePage={setPage} onChangeLimit={(v) => { changeLimit(v); setPage(1); }} />
    </div>
  );
}
