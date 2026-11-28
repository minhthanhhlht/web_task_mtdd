// Bảng lịch sử thay đổi của task (mới nhất trước, có phân trang).
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { getTaskHistory } from '../api.js';
import DataTable from './DataTable.jsx';
import { formatDateTime } from '../constants.js';
import usePageSize from '../usePageSize.js';
import Pagination from './Pagination.jsx';
import { ErrorBox, Loading } from './StateMessage.jsx';
import UserChip from './UserChip.jsx';

// Nhãn của từng nhóm nhật ký: [tên hiển thị, biến thể Badge]
const TYPE_BADGE = {
  task: ['Thông tin', 'neutral'],
  tien_do: ['Tiến độ', 'info'],
  checklist: ['Checklist', 'success'],
  van_de: ['Vấn đề', 'warning'],
};

export default function TaskHistory({ taskId, reloadKey }) {
  const [limit, changeLimit] = usePageSize();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getTaskHistory(taskId, { page, limit })
      .then((result) => { setData(result); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  // Tải lại khi đổi trang, số dòng hoặc task có thay đổi mới (reloadKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [taskId, page, limit, reloadKey]);

  const columns = useMemo(() => [
    { key: 'thoi_gian', header: 'Thời gian', width: pixel(200), renderCell: (i) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(i.thoi_gian)}</span> },
    { key: 'nguoi_thay_doi', header: 'Người thay đổi', width: pixel(170), renderCell: (i) => (i.nguoi_thay_doi ? <UserChip name={i.nguoi_thay_doi} className="max-w-32" /> : '—') },
    {
      key: 'loai', header: 'Nhóm', width: pixel(130),
      renderCell: (i) => { const [label, variant] = TYPE_BADGE[i.loai] ?? TYPE_BADGE.task; return <Badge variant={variant} label={label} />; },
    },
    { key: 'mo_ta', header: 'Nội dung thay đổi', width: proportional(1, { minWidth: 240 }), renderCell: (i) => <span className="block truncate" title={i.mo_ta}>{i.mo_ta}</span> },
  ], []);

  return (
    <div className="flex flex-col gap-2">
      <ErrorBox message={error} onRetry={load} />
      <DataTable isLoading={loading} minWidth={740} data={data.items} columns={columns} idKey="id" density="compact" emptyState={loading ? false : <EmptyState title="Chưa có thay đổi nào." isCompact />} />
      {loading && data.items.length === 0 && <Loading />}
      <Pagination total={data.total} page={page} limit={limit} unit="thay đổi" onChangePage={setPage} onChangeLimit={(value) => { changeLimit(value); setPage(1); }} />
    </div>
  );
}
