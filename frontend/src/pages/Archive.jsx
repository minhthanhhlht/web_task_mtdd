// Trang "Đã hoàn thành": danh sách task ở trạng thái hoàn thành (CLOSED, CANCELED...).
import TaskListView from '../components/TaskListView.jsx';

export default function Archive() {
  return <TaskListView archived />;
}
