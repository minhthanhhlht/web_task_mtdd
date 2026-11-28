// Trang quản lý trạng thái task (admin): thêm, sửa tên/màu/cờ, đổi thứ tự, xóa.
import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Selector } from '@astryxdesign/core/Selector';
import DataTable from '../components/DataTable.jsx';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { createStatus, deleteStatus, moveStatus, updateStatus } from '../api.js';
import { useDialog } from '../components/DialogContext.jsx';
import Pagination from '../components/Pagination.jsx';
import RowMenu from '../components/RowMenu.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useStatuses } from '../components/StatusContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { PAGE_SIZE, STATUS_COLOR_OPTIONS } from '../constants.js';

const COLOR_OPTIONS = Object.entries(STATUS_COLOR_OPTIONS).map(([value, opt]) => ({ value, label: opt.label }));

// Ô tên sửa tại chỗ (rời ô/Enter lưu, Esc hủy); nếu đang có task dùng thì hỏi xác nhận trước khi đổi
function NameCell({ status, onChange }) {
  const dialog = useDialog();
  const [name, setName] = useState(status.ten);
  const commitName = async () => {
    const next = name.trim();
    if (!next || next === status.ten) { setName(status.ten); return; }
    if (status.so_task > 0) {
      const ok = await dialog.confirm({ title: 'Đổi tên trạng thái', message: `Có ${status.so_task} task đang dùng "${status.ten}". Các task này sẽ đổi sang "${next}". Tiếp tục?`, confirmLabel: 'Đổi tên' });
      if (!ok) { setName(status.ten); return; }
    }
    if (!(await onChange(status, { ten: next }))) setName(status.ten);
  };
  return (
    <div className="min-w-56" onBlur={commitName}>
      <TextInput
        label={`Tên trạng thái ${status.ten}`} isLabelHidden value={name} onChange={setName} htmlName={`ten_${status.id}`}
        onEnter={commitName}
        onKeyDown={(e) => { if (e.key === 'Escape') setName(status.ten); }}
      />
    </div>
  );
}

export default function StatusManager() {
  const toast = useToast();
  const dialog = useDialog();
  const { statuses, reload, loading, error } = useStatuses();
  const [form, setForm] = useState({ ten: '', mau: 'gray', la_hoan_thanh: false, yeu_cau_hoan_tat: false });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Chạy thao tác, báo lỗi toast, tải lại danh sách trạng thái; trả true nếu thành công
  const run = async (action, message) => {
    try {
      await action();
      if (message) toast.success(message);
      await reload();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const add = async (event) => {
    event.preventDefault();
    if (!form.ten.trim()) { toast.error('Vui lòng nhập tên trạng thái'); return; }
    if (await run(() => createStatus({ ...form, ten: form.ten.trim() }), 'Đã thêm trạng thái')) setForm({ ten: '', mau: 'gray', la_hoan_thanh: false, yeu_cau_hoan_tat: false });
  };

  const remove = async (status) => {
    const ok = await dialog.confirm({ title: 'Xóa trạng thái', message: `Xóa trạng thái "${status.ten}"?`, confirmLabel: 'Xóa', danger: true });
    if (ok) run(() => deleteStatus(status.id), 'Đã xóa trạng thái');
  };

  const change = (s, patch) => run(() => updateStatus(s.id, patch));
  const pageItems = statuses.slice((page - 1) * limit, page * limit);
  const columns = [
    { key: 'stt', header: '#', renderCell: (s) => pageItems.indexOf(s) + 1 + (page - 1) * limit },
    { key: 'ten', header: 'Tên trạng thái', renderCell: (s) => <NameCell key={`${s.id}-${s.ten}`} status={s} onChange={change} /> },
    {
      key: 'mau', header: 'Màu',
      renderCell: (s) => <Selector label={`Màu của ${s.ten}`} isLabelHidden width={150} value={s.mau} options={COLOR_OPTIONS} onChange={(v) => v && change(s, { mau: v })} />,
    },
    { key: 'xem_truoc', header: 'Xem trước', renderCell: (s) => <StatusBadge name={s.ten} color={s.mau} /> },
    { key: 'la_hoan_thanh', header: 'Hoàn thành', renderCell: (s) => <CheckboxInput label={`${s.ten} là trạng thái hoàn thành`} isLabelHidden value={Boolean(s.la_hoan_thanh)} onChange={(checked) => change(s, { la_hoan_thanh: checked })} /> },
    { key: 'yeu_cau_hoan_tat', header: 'Yêu cầu 100% + checklist', renderCell: (s) => <CheckboxInput label={`${s.ten} yêu cầu 100% và checklist`} isLabelHidden value={Boolean(s.yeu_cau_hoan_tat)} onChange={(checked) => change(s, { yeu_cau_hoan_tat: checked })} /> },
    { key: 'so_task', header: 'Số task', renderCell: (s) => <span className="tabular-nums">{s.so_task}</span> },
    {
      key: 'thao_tac', header: '',
      renderCell: (s) => {
        const index = statuses.indexOf(s);
        return (
          <span className="inline-flex items-center gap-1">
            <Button label="Lên" size="sm" isIconOnly icon={<Icon icon={ArrowUp} />} isDisabled={index === 0} onClick={() => run(() => moveStatus(s.id, -1))} />
            <Button label="Xuống" size="sm" isIconOnly icon={<Icon icon={ArrowDown} />} isDisabled={index === statuses.length - 1} onClick={() => run(() => moveStatus(s.id, 1))} />
            <RowMenu items={[{ label: s.so_task > 0 ? `Xóa (đang có ${s.so_task} task dùng)` : 'Xóa', icon: 'trash', danger: true, disabled: s.so_task > 0, onClick: () => remove(s) }]} />
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Heading level={1}>Quản lý trạng thái</Heading>
      <Card>
        <form onSubmit={add} noValidate className="flex flex-wrap items-end gap-3">
          <TextInput label="Tên trạng thái" htmlName="ten" value={form.ten} onChange={(v) => setForm({ ...form, ten: v })} />
          <Selector label="Màu" width={150} value={form.mau} options={COLOR_OPTIONS} onChange={(v) => setForm({ ...form, mau: v ?? 'gray' })} />
          <CheckboxInput label="Hoàn thành" value={form.la_hoan_thanh} onChange={(c) => setForm({ ...form, la_hoan_thanh: c })} />
          <CheckboxInput label="Yêu cầu 100% + checklist" value={form.yeu_cau_hoan_tat} onChange={(c) => setForm({ ...form, yeu_cau_hoan_tat: c })} />
          <div className="flex flex-col gap-1">
            <Text type="supporting" color="secondary">Xem trước</Text>
            {form.ten.trim() ? <StatusBadge name={form.ten.trim()} color={form.mau} /> : <Text color="secondary">—</Text>}
          </div>
          <Button type="submit" variant="primary" label="Thêm" />
        </form>
      </Card>
      <ErrorBox message={error} onRetry={reload} />
      {loading && <Loading />}
      <DataTable data={pageItems} columns={columns} idKey="id" density="compact" />
      <Pagination total={statuses.length} page={page} limit={limit} unit="trạng thái" onChangePage={setPage} onChangeLimit={(v) => { setLimit(v); setPage(1); }} />
    </div>
  );
}
