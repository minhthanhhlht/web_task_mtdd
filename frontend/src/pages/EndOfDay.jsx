// Trang "Cập nhật tiến độ": sửa nhiều task một lượt rồi lưu tất cả trong một transaction.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import DataTable from '../components/DataTable.jsx';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { listTasks, saveEod } from '../api.js';
import { useDialog } from '../components/DialogContext.jsx';
import Pagination from '../components/Pagination.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import { useStatuses } from '../components/StatusContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { getReportStatus, REPORT_LEVEL_VARIANT } from '../reportStatus.js';
import usePageSize from '../usePageSize.js';
import { notifyReportChanged } from '../useReportSummary.js';

export default function EndOfDay() {
  const toast = useToast();
  const dialog = useDialog();
  const { statuses, getStatus } = useStatuses();
  const [limit, changeLimit] = usePageSize();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [data, setData] = useState({ items: [], total: 0 });
  const [edits, setEdits] = useState({}); // task_id -> { tien_do, trang_thai, ghi_chu, noteEdited }
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [data]);

  // Gõ tìm kiếm có chờ 300 ms
  useEffect(() => {
    const timer = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Tải danh sách task đang xử lý
  const load = useCallback(() => {
    setLoading(true);
    listTasks({ q, page, limit, notUpdated: onlyPending })
      .then((result) => { setData(result); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, page, limit, onlyPending]);
  useEffect(() => { load(); }, [load]);

  // Sửa một trường của một task
  const edit = (task, patch) => {
    setEdits((current) => ({
      ...current,
      [task.id]: { tien_do: task.tien_do, trang_thai: task.trang_thai, ghi_chu: task.ghi_chu, noteEdited: false, ...current[task.id], ...patch },
    }));
    setErrors((current) => ({ ...current, [task.id]: '' }));
  };

  // Gửi danh sách items lên server
  const send = async (items, message) => {
    setSaving(true);
    try {
      await saveEod(items);
      toast.success(message);
      setEdits({});
      setErrors({});
      notifyReportChanged();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // "Không đổi" cho một task: không gửi ghi chú
  const confirmOne = (task) => send([{ task_id: task.id, tien_do: task.tien_do, trang_thai: task.trang_thai }], 'Đã ghi nhận: không có gì thay đổi');

  // Task trên trang chưa cập nhật hôm nay và chưa sửa dở
  const untouched = data.items.filter((t) => !getReportStatus(t, now).updatedToday && !edits[t.id]);
  const confirmAll = async () => {
    const ok = await dialog.confirm({ title: 'Xác nhận không đổi', message: `Ghi nhận "không đổi" cho ${untouched.length} task trên trang này?`, confirmLabel: 'Xác nhận' });
    if (ok) send(untouched.map((t) => ({ task_id: t.id, tien_do: t.tien_do, trang_thai: t.trang_thai })), `Đã lưu ${untouched.length} task.`);
  };

  // Kiểm tra rồi lưu tất cả task đã sửa; ghi chú chỉ gửi khi người dùng sửa ô ghi chú
  const saveAll = () => {
    const ids = Object.keys(edits).map(Number);
    if (ids.length === 0) { toast.info('Chưa có thay đổi nào để lưu.'); return; }
    const found = {};
    const items = ids.map((id) => {
      const task = data.items.find((t) => t.id === id);
      const e = edits[id];
      const progress = e.tien_do;
      if (progress === null || progress === undefined || !Number.isInteger(progress) || progress < 0 || progress > 100) found[id] = 'Tiến độ phải là số nguyên từ 0 đến 100';
      else if (getStatus(e.trang_thai)?.yeu_cau_hoan_tat && progress !== 100) found[id] = `${e.trang_thai} thì phải 100%`;
      const item = { task_id: id, tien_do: progress, trang_thai: e.trang_thai };
      if (e.noteEdited) item.ghi_chu = e.ghi_chu;
      return task ? item : null;
    }).filter(Boolean);
    setErrors(found);
    if (Object.keys(found).length > 0) { toast.error('Còn ô tiến độ chưa hợp lệ, hãy kiểm tra lại.'); return; }
    send(items, `Đã lưu ${items.length} task.`);
  };

  const columns = [
    {
      key: 'task', header: 'Task', width: proportional(1, { minWidth: 280 }),
      renderCell: (task) => {
        const rs = getReportStatus(task, now);
        return (
          <div className="flex min-w-56 flex-col gap-1 py-1">
            <Text weight="semibold">{task.ten}</Text>
            <Text type="supporting" color="secondary">{task.ma_task}</Text>
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge variant={REPORT_LEVEL_VARIANT[rs.level]} label={rs.label} />
              {!rs.updatedToday && !edits[task.id] && <Button label="Không đổi" size="sm" isDisabled={saving} onClick={() => confirmOne(task)} />}
            </span>
          </div>
        );
      },
    },
    {
      key: 'tien_do', header: 'Tiến độ (%)', width: pixel(150),
      renderCell: (task) => (
        <NumberInput
          label={`Tiến độ của ${task.ten}`} isLabelHidden min={0} max={100} isIntegerOnly width={110}
          value={(edits[task.id] ?? task).tien_do}
          onChange={(v) => edit(task, { tien_do: v })}
          status={errors[task.id] ? { type: 'error', message: errors[task.id], } : undefined}
        />
      ),
    },
    {
      key: 'trang_thai', header: 'Trạng thái', width: pixel(240),
      renderCell: (task) => (
        <Selector
          label={`Trạng thái của ${task.ten}`} isLabelHidden width={200}
          value={(edits[task.id] ?? task).trang_thai}
          options={statuses.map((s) => ({ value: s.ten, label: s.ten }))}
          onChange={(v) => edit(task, { trang_thai: v ?? task.trang_thai })}
        />
      ),
    },
    {
      key: 'ghi_chu', header: 'Ghi chú', width: proportional(1, { minWidth: 260 }),
      renderCell: (task) => (
        <div className="min-w-64" title={task.ghi_chu_rich ? 'Ghi chú có định dạng hoặc ảnh: sửa ở trang chi tiết task' : undefined}>
          <TextArea
            label={`Ghi chú của ${task.ten}`} isLabelHidden rows={1}
            value={(edits[task.id] ?? task).ghi_chu}
            isReadOnly={Boolean(task.ghi_chu_rich)}
            onChange={(v) => edit(task, { ghi_chu: v, noteEdited: true })}
          />
        </div>
      ),
    },
  ];

  const editCount = Object.keys(edits).length;
  return (
    <div className="flex flex-col gap-3">
      <Heading level={1}>Cập nhật tiến độ</Heading>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1 sm:max-w-sm">
          <TextInput label="Tìm task..." isLabelHidden placeholder="Tìm task..." startIcon="search" hasClear value={search} onChange={setSearch} htmlName="tim_task" />
        </div>
        <CheckboxInput label="Chỉ task chưa cập nhật hôm nay" value={onlyPending} onChange={(checked) => { setOnlyPending(checked); setPage(1); }} />
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {editCount > 0 && <Badge variant="warning" label={`${editCount} thay đổi chưa lưu`} />}
          <Button label={`Xác nhận không đổi (${untouched.length})`} isDisabled={saving || untouched.length === 0} onClick={confirmAll} />
          <Button label={saving ? 'Đang lưu...' : 'Lưu tất cả'} variant="primary" isDisabled={saving} onClick={saveAll} />
        </div>
      </div>
      <ErrorBox message={error} onRetry={load} />
      <DataTable minWidth={930} data={data.items} columns={columns} idKey="id" verticalAlign="middle" emptyState={loading ? false : <EmptyState title="Không có task nào." isCompact />} />
      {loading && <Loading />}
      <Pagination total={data.total} page={page} limit={limit} onChangePage={setPage} onChangeLimit={(v) => { changeLimit(v); setPage(1); }} />
    </div>
  );
}
