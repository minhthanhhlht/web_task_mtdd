// Trang "Cài đặt" (chỉ admin): sao lưu dữ liệu — tạo bản sao lưu ngay, xem danh sách, tải về máy, xóa.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { Download, DatabaseBackup } from 'lucide-react';
import { backupDownloadUrl, createBackup, deleteBackup, listBackups } from '../api.js';
import DataTable from '../components/DataTable.jsx';
import { useDialog } from '../components/DialogContext.jsx';
import RowMenu from '../components/RowMenu.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import { useToast } from '../components/Toast.jsx';

// Dung lượng dễ đọc: KB / MB
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SettingsPage() {
  const toast = useToast();
  const dialog = useDialog();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // Tải danh sách bản sao lưu
  const load = useCallback(() => {
    setLoading(true);
    listBackups()
      .then((data) => { setItems(data.items); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Tạo bản sao lưu ngay
  const create = async () => {
    setCreating(true);
    try {
      const info = await createBackup();
      toast.success(`Đã tạo bản sao lưu ${info.ten}`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Xóa một bản sao lưu sau khi xác nhận
  const remove = useCallback(async (item) => {
    const ok = await dialog.confirm({ title: 'Xóa bản sao lưu', message: `Xóa file ${item.ten}? Không thể hoàn tác.`, confirmLabel: 'Xóa', danger: true });
    if (!ok) return;
    try {
      await deleteBackup(item.ten);
      toast.success('Đã xóa bản sao lưu');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }, [dialog, toast, load]);

  const columns = useMemo(() => [
    { key: 'ten', header: 'Tên file', width: proportional(1, { minWidth: 240 }), renderCell: (b) => <span className="block truncate" title={b.ten}>{b.ten}</span> },
    { key: 'tao_luc', header: 'Tạo lúc', width: pixel(210), renderCell: (b) => <span className="whitespace-nowrap tabular-nums">{b.tao_luc}</span> },
    { key: 'kich_thuoc', header: 'Dung lượng', width: pixel(140), renderCell: (b) => <span className="whitespace-nowrap tabular-nums">{formatSize(b.kich_thuoc)}</span> },
    {
      key: 'thao_tac', header: '', width: pixel(170),
      renderCell: (b) => (
        <span className="inline-flex items-center gap-1">
          <Button label="Tải về" size="sm" href={backupDownloadUrl(b.ten)} icon={<Icon icon={Download} />} />
          <RowMenu items={[{ label: 'Xóa', icon: 'trash', danger: true, onClick: () => remove(b) }]} />
        </span>
      ),
    },
  ], [remove]);

  return (
    <div className="flex flex-col gap-4">
      <Heading level={1}>Cài đặt</Heading>
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Heading level={2}>Sao lưu dữ liệu</Heading>
              <Text color="secondary">Bản sao lưu là file database nằm trên máy chủ (thư mục backups cạnh database). Hãy tải về máy định kỳ để có bản lưu ở nơi khác.</Text>
            </div>
            <Button label={creating ? 'Đang sao lưu...' : 'Tạo bản sao lưu ngay'} variant="primary" icon={<Icon icon={DatabaseBackup} />} isDisabled={creating} onClick={create} />
          </div>
          <ErrorBox message={error} onRetry={load} />
          {loading && items.length === 0 && <Loading />}
          <DataTable
            minWidth={760}
            data={items}
            columns={columns}
            idKey="ten"
            density="compact"
            isLoading={loading}
            emptyState={loading ? false : <EmptyState title="Chưa có bản sao lưu nào." isCompact />}
          />
        </div>
      </Card>
    </div>
  );
}
