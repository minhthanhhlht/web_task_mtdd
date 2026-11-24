// Trang thêm task mới.
import { useNavigate } from 'react-router-dom';
import { createTask } from '../api.js';
import TaskForm from '../components/TaskForm.jsx';
import { useToast } from '../components/Toast.jsx';
import { CARD_CLASS, DEFAULT_ASSIGNER, getNow, TASK_CODE_PREFIX } from '../constants.js';

// Giá trị đầu của form thêm mới
const INITIAL_VALUES = {
  ma_task: TASK_CODE_PREFIX, ten: '', ngay_nhan: getNow(), deadline: '', dev_hoan_thanh_thuc_te: '',
  nguoi_giao: DEFAULT_ASSIGNER, ghi_chu: '', link_test_case: '', dev_cross_check: '',
};

export default function TaskNew() {
  const navigate = useNavigate();
  const toast = useToast();

  // Tạo task rồi mở trang chi tiết
  const submit = async (payload) => {
    const task = await createTask(payload);
    toast.success('Đã tạo task');
    navigate(`/tasks/${task.id}`);
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Thêm task</h1>
      <div className={CARD_CLASS}>
        <TaskForm initialValues={INITIAL_VALUES} submitLabel="Tạo task" onSubmit={submit} gridClass="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" />
      </div>
    </div>
  );
}
