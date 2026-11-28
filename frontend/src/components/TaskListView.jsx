// Danh sách task dùng cho "Đang xử lý" (archived=false) và "Đã hoàn thành" (archived=true).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Selector } from '@astryxdesign/core/Selector';
import { pixel, proportional, useTableSortable } from '@astryxdesign/core/Table';
import DataTable from './DataTable.jsx';
import { TextInput } from '@astryxdesign/core/TextInput';
import { listTasks, saveEod } from '../api.js';
import { getReportStatus, REPORT_LEVEL_VARIANT } from '../reportStatus.js';
import usePageSize from '../usePageSize.js';
import useReportSummary, { notifyReportChanged } from '../useReportSummary.js';
import { useAuth } from './AuthContext.jsx';
import Pagination from './Pagination.jsx';
import ProgressBar from './ProgressBar.jsx';
import PwireLink from './PwireLink.jsx';
import { ErrorBox, Loading } from './StateMessage.jsx';
import StatusBadge from './StatusBadge.jsx';
import { useStatuses } from './StatusContext.jsx';
import TaskStats from './TaskStats.jsx';
import { useToast } from './Toast.jsx';
import UserChip from './UserChip.jsx';

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
  if (day < key(today)) return 'font-medium text-(--color-text-error)';
  if (day <= key(tomorrow)) return 'font-medium text-(--color-text-warning)';
  return '';
}

export default function TaskListView({ archived }) {
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

  // Sắp xếp do backend làm: Table chỉ hiển thị trạng thái sắp xếp và báo khi người dùng bấm tiêu đề
  const sortPlugin = useTableSortable({
    sort: sort.key ? [{ sortKey: sort.key, direction: sort.dir === 'asc' ? 'ascending' : 'descending' }] : [],
    onSortChange: (next) => {
      setPage(1);
      setSort(next.length ? { key: next[0].sortKey, dir: next[0].direction === 'ascending' ? 'asc' : 'desc' } : { key: '', dir: 'asc' });
    },
  });

  // "Không đổi": xác nhận không có gì thay đổi, không gửi ghi chú
  const confirmUnchanged = useCallback(async (task) => {
    try {
      await saveEod([{ task_id: task.id, tien_do: task.tien_do, trang_thai: task.trang_thai }]);
      toast.success('Đã ghi nhận: không có gì thay đổi ở tiến độ hôm nay');
      setReloadKey((k) => k + 1);
      notifyReportChanged();
    } catch (err) {
      toast.error(err.message);
    }
  }, [toast]);

  const columns = useMemo(() => [
    ...(isAdmin ? [{ key: 'chu_so_huu', header: 'PIC', width: pixel(100), sortable: true, renderCell: (t) => (t.chu_so_huu ? <UserChip name={t.chu_so_huu} /> : '—') }] : []),
    { key: 'ma_task', header: 'Số Pwire', width: pixel(132), sortable: true, renderCell: (t) => <span className="whitespace-nowrap"><Link href={`/tasks/${t.id}`}>{t.ma_task}</Link></span> },
    { key: 'ten', header: 'Tên', width: proportional(1, { minWidth: 90 }), sortable: true, renderCell: (t) => <span className="block truncate" title={t.ten}>{t.ten}</span> },
    { key: 'link_test_case', header: 'Link Pwire', width: pixel(96), sortable: true, renderCell: (t) => <PwireLink url={t.link_test_case} compact /> },
    { key: 'nguoi_giao', header: 'Người giao', width: pixel(85), sortable: true, renderCell: (t) => <span className="block truncate" title={t.nguoi_giao}>{t.nguoi_giao}</span> },
    {
      key: 'deadline', header: 'Deadline', width: pixel(125), sortable: true,
      renderCell: (t) => <span className={`whitespace-nowrap tabular-nums ${archived ? '' : deadlineTone(t.deadline)}`} title={t.deadline ?? undefined}>{t.deadline ? shortDateTime(t.deadline).slice(0, 16) : '—'}</span>,
    },
    { key: 'tien_do', header: 'Tiến độ', width: pixel(105), sortable: true, renderCell: (t) => <ProgressBar value={t.tien_do} /> },
    { key: 'trang_thai', header: 'Trạng thái', width: pixel(115), sortable: true, renderCell: (t) => <StatusBadge name={t.trang_thai} /> },
    {
      key: 'checklist', header: 'Checklist', width: pixel(86), sortable: true,
      renderCell: (t) => <span className={`tabular-nums ${t.checklist_tong > 0 && t.checklist_da_xong === t.checklist_tong ? 'font-medium text-(--color-text-success)' : ''}`}>{t.checklist_da_xong}/{t.checklist_tong}</span>,
    },
    ...(archived ? [] : [{
      key: 'cap_nhat', header: 'Cập nhật', width: pixel(215), sortable: true,
      renderCell: (t) => {
        const rs = getReportStatus(t, report.now);
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Badge variant={REPORT_LEVEL_VARIANT[rs.level]} label={rs.updatedToday ? shortDateTime(rs.updatedAtFull ?? t.ngay_cap_nhat_cuoi) : rs.level === 'pending' ? 'Chưa cập nhật' : rs.label} />
            {!rs.updatedToday && <Button label="Không đổi" size="sm" onClick={() => confirmUnchanged(t)} />}
          </span>
        );
      },
    }]),
  ], [isAdmin, archived, report.now, confirmUnchanged]);

  return (
    <div className="flex flex-col gap-3">
      <Heading level={1}>{archived ? 'Đã hoàn thành' : 'Danh sách task đang xử lý'}</Heading>
      {!archived && <TaskStats reportTotal={report.total} />}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1 sm:max-w-sm">
          <TextInput label="Tìm Số Pwire, tên..." isLabelHidden placeholder="Tìm Số Pwire, tên..." startIcon="search" hasClear value={search} onChange={setSearch} htmlName="tim_so_pwire_ten" />
        </div>
        {!archived && (
          <>
            <Selector
              label="Lọc theo trạng thái" isLabelHidden value={status} width={220}
              options={[{ value: '', label: 'Tất cả trạng thái' }, ...activeStatuses.map((s) => ({ value: s.ten, label: s.ten }))]}
              onChange={(value) => { setStatus(value ?? ''); setPage(1); }}
            />
            <CheckboxInput label="Chưa cập nhật hôm nay" value={notUpdated} onChange={(checked) => { setNotUpdated(checked); setPage(1); }} />
            <div className="ml-auto"><Button label="Thêm task" variant="primary" href="/tasks/new" /></div>
          </>
        )}
      </div>

      {!archived && report.total > 0 && (
        <Banner
          status="error"
          title={`${report.afterCutoff ? `Có ${report.total} task chưa cập nhật tiến độ hôm nay` : `Còn ${report.total} task chưa cập nhật tiến độ (chốt lúc 16:30)`}${report.missed > 0 ? `, trong đó ${report.missed} task đã bỏ sót từ các ngày trước` : ''}`}
          endContent={<Button label="Cập nhật ngay" href="/cuoi-chieu" />}
        />
      )}

      <ErrorBox message={error} onRetry={load} />
      <DataTable
        minWidth={isAdmin ? 1149 : 1049}
        data={data.items}
        columns={columns}
        idKey="id"
        density="compact"
        hasHover
        plugins={{ sort: sortPlugin }}
        emptyState={loading ? false : <EmptyState title="Không có task nào." isCompact />}
      />
      {loading && <Loading />}
      <Pagination total={data.total} page={page} limit={limit} onChangePage={setPage} onChangeLimit={(v) => { changeLimit(v); setPage(1); }} />
    </div>
  );
}
