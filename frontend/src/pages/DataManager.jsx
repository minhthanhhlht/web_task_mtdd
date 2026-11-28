// Trang quản lý data dùng chung (admin): hiện có nhóm Dev — thêm, thêm nhiều, đổi tên, đổi thứ tự, xóa.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import DataTable from '../components/DataTable.jsx';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { createDataItem, createDataItemsBulk, deleteDataItem, listDataGroups, moveDataItem, updateDataItem } from '../api.js';
import { useDialog } from '../components/DialogContext.jsx';
import Pagination from '../components/Pagination.jsx';
import RowMenu from '../components/RowMenu.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import { useToast } from '../components/Toast.jsx';
import { PAGE_SIZE } from '../constants.js';

// Ô tên sửa tại chỗ: đổi tên rời ô/Enter, Esc hủy
function NameCell({ item, onRename }) {
  const [name, setName] = useState(item.ten);
  const commit = async () => {
    const next = name.trim();
    if (!next || next === item.ten) { setName(item.ten); return; }
    if (!(await onRename(item, next))) setName(item.ten);
  };
  return (
    <div className="min-w-64" onBlur={commit}>
      <TextInput label={`Tên ${item.ten}`} isLabelHidden value={name} onChange={setName} htmlName={`ten_${item.id}`} onEnter={commit} onKeyDown={(e) => { if (e.key === 'Escape') setName(item.ten); }} />
    </div>
  );
}

export default function DataManager() {
  const toast = useToast();
  const dialog = useDialog();
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState('dev');
  const [name, setName] = useState('');
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    listDataGroups()
      .then((data) => { setGroups(data.groups); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Chạy thao tác rồi tải lại; trả true nếu thành công
  const run = async (action, message) => {
    try {
      const result = await action();
      if (message) toast.success(typeof message === 'function' ? message(result) : message);
      load();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const group = groups.find((g) => g.key === active);
  const items = group?.items ?? [];

  const add = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (await run(() => createDataItem({ nhom: active, ten: name.trim() }), 'Đã thêm')) setName('');
  };
  const addBulk = async () => {
    const list = bulk.split('\n').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return;
    if (await run(() => createDataItemsBulk({ nhom: active, ten_list: list }), (r) => `Đã thêm ${r.added}, bỏ qua ${r.skipped} tên đã có`)) setBulk('');
  };
  const remove = async (item) => {
    const ok = await dialog.confirm({ title: 'Xóa mục', message: `Xóa "${item.ten}"?`, confirmLabel: 'Xóa', danger: true });
    if (ok) run(() => deleteDataItem(item.id), 'Đã xóa');
  };

  const pageItems = items.slice((page - 1) * limit, page * limit);
  const columns = [
    { key: 'stt', header: '#', width: pixel(70), renderCell: (item) => items.indexOf(item) + 1 },
    { key: 'ten', header: 'Tên', width: proportional(1, { minWidth: 280 }), renderCell: (item) => <NameCell key={`${item.id}-${item.ten}`} item={item} onRename={(it, next) => run(() => updateDataItem(it.id, { ten: next }))} /> },
    { key: 'so_task', header: 'Số task đang dùng', width: pixel(200), renderCell: (item) => <span className="tabular-nums">{item.so_task}</span> },
    {
      key: 'thao_tac', header: '', width: pixel(160),
      renderCell: (item) => {
        const index = items.indexOf(item);
        return (
          <span className="inline-flex items-center gap-1">
            <Button label="Lên" size="sm" isIconOnly icon={<Icon icon={ArrowUp} />} isDisabled={index === 0} onClick={() => run(() => moveDataItem(item.id, -1))} />
            <Button label="Xuống" size="sm" isIconOnly icon={<Icon icon={ArrowDown} />} isDisabled={index === items.length - 1} onClick={() => run(() => moveDataItem(item.id, 1))} />
            <RowMenu items={[{ label: item.so_task > 0 ? `Xóa (đang có ${item.so_task} task dùng)` : 'Xóa', icon: 'trash', danger: true, disabled: item.so_task > 0, onClick: () => remove(item) }]} />
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Heading level={1}>Quản lý data</Heading>
      <TabList value={active} onChange={(v) => { setActive(v); setPage(1); }} hasDivider>
        {groups.map((g) => <Tab key={g.key} value={g.key} label={g.label} />)}
      </TabList>
      <ErrorBox message={error} onRetry={load} />
      {loading && <Loading />}
      <Card>
        <div className="flex flex-col gap-3">
          <form onSubmit={add} noValidate className="flex flex-wrap items-center gap-2">
            <div className="w-64"><TextInput label="Tên mới" isLabelHidden placeholder="Tên mới" value={name} onChange={setName} htmlName="ten_moi" /></div>
            <Button type="submit" variant="primary" label="Thêm" />
            <Button label="Thêm nhiều" onClick={() => setShowBulk(!showBulk)} />
          </form>
          {showBulk && (
            <div className="flex flex-col gap-2">
              <TextArea label="Danh sách tên" isLabelHidden rows={6} placeholder="Mỗi dòng một tên" value={bulk} onChange={setBulk} />
              <div><Button label="Thêm danh sách" variant="primary" onClick={addBulk} /></div>
            </div>
          )}
        </div>
      </Card>
      <DataTable minWidth={710} data={pageItems} columns={columns} idKey="id" density="compact" />
      <Pagination total={items.length} page={page} limit={limit} unit="mục" onChangePage={setPage} onChangeLimit={(v) => { setLimit(v); setPage(1); }} />
    </div>
  );
}
