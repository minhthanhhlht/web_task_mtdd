// Trang chi tiết task: lưới 4 khối (thông tin, checklist, vấn đề QnA/Process, lịch sử thay đổi).
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { ArrowLeft, Trash2 } from 'lucide-react';
import {
  addIssue, deleteIssue, deleteTask, getTask, saveEod, setAllChecklist, setChecklistItem, updateIssue, updateTask,
} from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';
import ChecklistBox from '../components/ChecklistBox.jsx';
import { useDialog } from '../components/DialogContext.jsx';
import IssueForm from '../components/IssueForm.jsx';
import IssueRow from '../components/IssueRow.jsx';
import PicTransfer from '../components/PicTransfer.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import SelectAllCheckbox from '../components/SelectAllCheckbox.jsx';
import { ErrorBox, Loading } from '../components/StateMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useStatuses } from '../components/StatusContext.jsx';
import TaskForm from '../components/TaskForm.jsx';
import TaskHistory from '../components/TaskHistory.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatDateTime } from '../constants.js';
import { notifyReportChanged } from '../useReportSummary.js';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const dialog = useDialog();
  const { user } = useAuth();
  const { getStatus } = useStatuses();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  // Tải chi tiết task; sau mỗi thay đổi cũng tải lại lịch sử
  const load = useCallback(async () => {
    try {
      setTask(await getTask(id));
      setError('');
      setHistoryKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Chạy một thao tác, báo toast và tải lại
  const run = async (action, successMessage) => {
    try {
      const result = await action();
      if (successMessage) toast.success(successMessage);
      await load();
      return result;
    } catch (err) {
      toast.error(err.message);
      return undefined;
    }
  };

  if (error && !task) return <ErrorBox message={error} onRetry={load} />;
  if (!task) return <Loading />;

  const items = task.checklist_items;
  const doneCount = items.filter((i) => i.da_xong).length;
  const finished = Boolean(getStatus(task.trang_thai)?.la_hoan_thanh);

  // Lưu thông tin task (tiến độ đổi thì server ghi cập nhật hôm nay)
  const saveInfo = async (payload) => {
    const progressChanged = payload.tien_do !== task.tien_do;
    const saved = await updateTask(task.id, payload);
    toast.success(progressChanged ? 'Đã lưu thay đổi và ghi cập nhật tiến độ hôm nay' : 'Đã lưu thay đổi');
    if (progressChanged) notifyReportChanged();
    // Đổi Số Pwire thì id nội bộ đổi theo: chuyển sang địa chỉ mới (trang tự tải lại)
    if (saved && saved.id !== task.id) { navigate(`/tasks/${saved.id}`, { replace: true }); return; }
    await load();
  };

  // Xóa task sau khi xác nhận
  const remove = async () => {
    const ok = await dialog.confirm({ title: 'Xóa task', message: `Xóa task "${task.ten}"? Task được chuyển vào mục "Task đã xóa", quản trị viên có thể khôi phục.`, confirmLabel: 'Xóa', danger: true });
    if (!ok) return;
    try {
      await deleteTask(task.id);
      toast.success('Đã xóa task');
      notifyReportChanged();
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Không đổi tiến độ: không gửi ghi chú
  const unchanged = () => run(async () => {
    await saveEod([{ task_id: task.id, tien_do: task.tien_do, trang_thai: task.trang_thai }]);
    notifyReportChanged();
  }, 'Đã ghi nhận: không có gì thay đổi ở tiến độ hôm nay');

  // Sao chép mẫu comment vào clipboard
  const copyTemplate = async () => {
    const text = `Task: ${task.ma_task} - ${task.ten}\nDev done: \nCTS: \nObject: \nTest case: ${task.link_test_case}`;
    try { await navigator.clipboard.writeText(text); toast.success('Đã sao chép mẫu comment'); } catch { toast.error('Không sao chép được'); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button label="Danh sách" href="/" icon={<Icon icon={ArrowLeft} />} />
        <div className="min-w-0"><Heading level={1}>{task.ten}</Heading></div>
        <StatusBadge name={task.trang_thai} />
        <ProgressBar value={task.tien_do} />
        <div className="flex w-full flex-wrap items-center gap-3">
          {!finished && <Button label="Không đổi tiến độ" onClick={unchanged} />}
          <Button label="Xóa task" variant="destructive" icon={<Icon icon={Trash2} />} onClick={remove} />
          {user.vai_tro === 'admin' && <PicTransfer task={task} onDone={load} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="order-1 min-w-0">
          <Card>
            <div className="flex flex-col gap-2">
              <Heading level={2}>Thông tin</Heading>
              <Text type="supporting" color="secondary">Tạo lúc {formatDateTime(task.tao_luc)} · Cập nhật lúc {formatDateTime(task.cap_nhat_luc)}</Text>
              <TaskForm key={task.cap_nhat_luc} initialValues={task} showProgress submitLabel="Lưu thay đổi" onSubmit={saveInfo} />
            </div>
          </Card>
        </div>

        <div className="order-2 min-w-0">
          <Card>
            <div className="flex flex-col gap-2">
              <Heading level={2}>Checklist ({doneCount}/{items.length})</Heading>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SelectAllCheckbox
                  checked={items.length > 0 && doneCount === items.length}
                  indeterminate={doneCount > 0 && doneCount < items.length}
                  disabled={items.length === 0}
                  onChange={async (checked) => {
                    if (!checked) {
                      const ok = await dialog.confirm({ title: 'Bỏ tick tất cả', message: 'Bỏ tick tất cả mục checklist của task này?', confirmLabel: 'Bỏ tick' });
                      if (!ok) return;
                    }
                    run(() => setAllChecklist(task.id, checked));
                  }}
                />
                <Button label="Sao chép mẫu comment" onClick={copyTemplate} />
              </div>
              {items.map((item) => <ChecklistBox key={item.id} item={item} onToggle={(it, done) => run(() => setChecklistItem(it.id, done))} />)}
            </div>
          </Card>
        </div>

        <div className="order-3 min-w-0">
          <Card>
            <div className="flex flex-col gap-2">
              <Heading level={2}>Vấn đề QnA / Process</Heading>
              {task.issues.length === 0 ? <Text color="secondary">Chưa có vấn đề nào.</Text> : (
                <ul className="divide-y divide-(--color-border) rounded-lg border border-(--color-border)">
                  {task.issues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} onUpdate={(issueId, body) => run(() => updateIssue(issueId, body))} onDelete={(issueId) => run(() => deleteIssue(issueId), 'Đã xóa vấn đề')} />
                  ))}
                </ul>
              )}
              <IssueForm onAdd={async (body) => { await addIssue(task.id, body); toast.success('Đã thêm vấn đề'); await load(); }} />
            </div>
          </Card>
        </div>

        <div className="order-4 min-w-0 xl:col-span-2">
          <Card>
            <div className="flex flex-col gap-2">
              <Heading level={2}>Lịch sử thay đổi</Heading>
              <TaskHistory taskId={task.id} reloadKey={historyKey} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
