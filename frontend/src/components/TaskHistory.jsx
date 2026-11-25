// Bảng lịch sử thay đổi của task (mới nhất trước, có phân trang).
import { useEffect, useState } from 'react';
import { getTaskHistory } from '../api.js';
import { formatDateTime, TABLE_BORDER_CLASS } from '../constants.js';
import usePageSize from '../usePageSize.js';
import Pagination from './Pagination.jsx';
import UserChip from './UserChip.jsx';
import { ErrorBox, Loading } from './StateMessage.jsx';

// Nhãn màu của từng nhóm nhật ký
const TYPE_BADGE = {
  task: ['Thông tin', 'bg-secondary text-foreground'],
  tien_do: ['Tiến độ', 'bg-blue-50 text-blue-700'],
  checklist: ['Checklist', 'bg-success-bg text-success'],
  van_de: ['Vấn đề', 'bg-warning-bg text-warning'],
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

  return (
    <div>
      <ErrorBox message={error} onRetry={load} />
      {loading && <Loading />}
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${TABLE_BORDER_CLASS}`}>
          <thead className="bg-surface-hover text-left">
            <tr><th className="px-3 py-1.5">Thời gian</th><th className="px-3 py-1.5">Người thay đổi</th><th className="px-3 py-1.5">Nhóm</th><th className="px-3 py-1.5">Nội dung thay đổi</th></tr>
          </thead>
          <tbody>
            {data.items.map((item) => {
              const [label, className] = TYPE_BADGE[item.loai] ?? TYPE_BADGE.task;
              return (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-1.5">{formatDateTime(item.thoi_gian)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">{item.nguoi_thay_doi ? <UserChip name={item.nguoi_thay_doi} className="max-w-32" /> : '—'}</td>
                  <td className="px-3 py-1.5"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 ${className}`}>{label}</span></td>
                  <td className="px-3 py-1.5 break-words">{item.mo_ta}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && data.items.length === 0 && <p className="py-3 text-sm text-muted">Chưa có thay đổi nào.</p>}
      <Pagination total={data.total} page={page} limit={limit} unit="thay đổi" onChangePage={setPage} onChangeLimit={(value) => { changeLimit(value); setPage(1); }} />
    </div>
  );
}
