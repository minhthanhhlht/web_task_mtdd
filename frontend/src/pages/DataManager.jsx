// Trang quản lý data dùng chung (admin): hiện có nhóm Dev — thêm, thêm nhiều, đổi tên, đổi thứ tự, xóa.
import RowMenu from '../components/RowMenu.jsx';
import MenuIcon from '../components/MenuIcon.jsx';
import { useCallback, useEffect, useState } from 'react';
import { createDataItem, createDataItemsBulk, deleteDataItem, listDataGroups, moveDataItem, updateDataItem } from '../api.js';
import { useDialog } from '../components/DialogContext.jsx';
import Pagination from '../components/Pagination.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import { useToast } from '../components/Toast.jsx';
import { BUTTON_ICON, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD_CLASS, INPUT_CLASS, TABLE_BORDER_CLASS, PAGE_SIZE } from '../constants.js';

// Một dòng mục dữ liệu: đổi tên rời ô/Enter
function ItemRow({ item, index, count, onRename, onMove, onDelete }) {
  const [name, setName] = useState(item.ten);
  const commit = async () => {
    const next = name.trim();
    if (!next || next === item.ten) { setName(item.ten); return; }
    if (!(await onRename(item, next))) setName(item.ten);
  };
  return (
    <tr>
      <td className="px-3 py-1.5">{index + 1}</td>
      <td className="px-3 py-1.5">
        <input aria-label={`Tên ${item.ten}`} name={`ten_${item.id}`} className={`w-64 ${INPUT_CLASS}`} value={name} onChange={(e) => setName(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setName(item.ten); e.target.blur(); } }} />
      </td>
      <td className="px-3 py-1.5">{item.so_task}</td>
      <td className="whitespace-nowrap px-3 py-1.5">
        <button type="button" className={BUTTON_ICON} disabled={index === 0} onClick={() => onMove(item, -1)} aria-label="Lên"><MenuIcon name="arrow-up" className="size-4" /></button>{' '}
        <button type="button" className={BUTTON_ICON} disabled={index === count - 1} onClick={() => onMove(item, 1)} aria-label="Xuống"><MenuIcon name="arrow-down" className="size-4" /></button>{' '}
        <RowMenu items={[{ label: 'Xóa', icon: 'trash', danger: true, disabled: item.so_task > 0, title: item.so_task > 0 ? `Đang có ${item.so_task} task dùng` : undefined, onClick: () => onDelete(item) }]} />
      </td>
    </tr>
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

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Quản lý data</h1>
      <div className="mb-3 flex gap-1">
        {groups.map((g) => (
          <button key={g.key} type="button" onClick={() => { setActive(g.key); setPage(1); }} className={`rounded-t-xl border border-b-0 border-border-strong px-4 py-1.5 text-sm ${active === g.key ? 'bg-surface font-semibold text-primary' : 'bg-surface-hover text-muted'}`}>{g.label}</button>
        ))}
      </div>
      <ErrorBox message={error} onRetry={load} />
      {loading && <Loading />}
      <div className={`${CARD_CLASS} mb-4`}>
        <form onSubmit={add} noValidate className="flex flex-wrap gap-2">
          <input className={`w-64 ${INPUT_CLASS}`} aria-label="Tên mới" name="ten_moi" placeholder="Tên mới" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className={BUTTON_PRIMARY}>Thêm</button>
          <button type="button" className={BUTTON_SECONDARY} onClick={() => setShowBulk(!showBulk)}>Thêm nhiều</button>
        </form>
        {showBulk && (
          <div className="mt-3">
            <textarea rows={6} className={`w-full ${INPUT_CLASS}`} placeholder="Mỗi dòng một tên" value={bulk} onChange={(e) => setBulk(e.target.value)} />
            <button type="button" className={`mt-2 ${BUTTON_PRIMARY}`} onClick={addBulk}>Thêm danh sách</button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border-strong bg-surface">
        <table className={`w-full text-sm ${TABLE_BORDER_CLASS}`}>
          <thead className="bg-surface-hover text-left"><tr><th className="px-3 py-1.5">#</th><th className="px-3 py-1.5">Tên</th><th className="px-3 py-1.5">Số task đang dùng</th><th className="px-3 py-1.5" /></tr></thead>
          <tbody>
            {items.slice((page - 1) * limit, page * limit).map((item, i) => (
              <ItemRow
                key={`${item.id}-${item.ten}`} item={item} index={(page - 1) * limit + i} count={items.length}
                onRename={(it, next) => run(() => updateDataItem(it.id, { ten: next }))}
                onMove={(it, dir) => run(() => moveDataItem(it.id, dir))}
                onDelete={remove}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={items.length} page={page} limit={limit} unit="mục" onChangePage={setPage} onChangeLimit={(v) => { setLimit(v); setPage(1); }} />
    </div>
  );
}
