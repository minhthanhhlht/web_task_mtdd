// Trang "Đang xử lý": danh sách task chưa hoàn thành.
import TaskListView from '../components/TaskListView.jsx';

export default function TaskList() {
  return <TaskListView archived={false} />;
}
