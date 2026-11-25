// Khung ứng dụng: sidebar menu, thanh trên và các route.
import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { EXPORT_URL } from './api.js';
import { useAuth } from './components/AuthContext.jsx';
import MenuIcon from './components/MenuIcon.jsx';
import UserChip from './components/UserChip.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import { BUTTON_SECONDARY } from './constants.js';
import Accounts from './pages/Accounts.jsx';
import Archive from './pages/Archive.jsx';
import Checklist from './pages/Checklist.jsx';
import DataManager from './pages/DataManager.jsx';
import DeletedTasks from './pages/DeletedTasks.jsx';
import EndOfDay from './pages/EndOfDay.jsx';
import StatusManager from './pages/StatusManager.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import TaskList from './pages/TaskList.jsx';
import TaskNew from './pages/TaskNew.jsx';
import useReportSummary from './useReportSummary.js';

const NARROW_QUERY = '(max-width: 1023px)';

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const report = useReportSummary(location.pathname);
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  const [open, setOpen] = useState(() => !window.matchMedia(NARROW_QUERY).matches);
  const isAdmin = user.vai_tro === 'admin';

  // Qua ngưỡng 1024px thì tự ẩn/hiện sidebar
  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const onChange = (event) => { setNarrow(event.matches); setOpen(!event.matches); };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Danh sách menu: [đường dẫn, nhãn, icon, chỉ admin, end]
  const menu = [
    ['/', 'Đang xử lý', 'list', false, true],
    ['/tasks/new', 'Thêm task', 'plus', false],
    ['/cuoi-chieu', 'Cập nhật tiến độ', 'chart', false],
    ['/checklist', 'Checklist', 'check', false],
    ['/trang-thai', 'Quản lý trạng thái', 'tag', true],
    ['/quan-ly-data', 'Quản lý data', 'database', true],
    ['/archive', 'Đã hoàn thành', 'archive', false],
    ['/da-xoa', 'Task đã xóa', 'trash', true],
    ['/tai-khoan', 'Tài khoản', 'users', false],
  ].filter((item) => !item[3] || isAdmin);

  const sidebar = (
    <aside className={`flex w-60 flex-col border-r border-border-strong bg-surface ${narrow ? 'fixed inset-y-0 left-0 z-30 shadow-modal' : ''}`}>
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border-strong px-5 text-base font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><MenuIcon name="check" className="size-4" /></span>
        Quản lý task
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {menu.map(([to, label, icon, , end]) => (
          <NavLink
            key={to} to={to} end={end} onClick={() => narrow && setOpen(false)}
            className={({ isActive }) => `flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${isActive ? 'bg-primary-light font-medium text-primary' : 'text-foreground/70 hover:bg-item-hover hover:text-foreground'}`}
          >
            <MenuIcon name={icon} />
            <span className="flex-1">{label}</span>
            {to === '/cuoi-chieu' && report.total > 0 && <span className="rounded-full bg-error-bg px-2 py-0.5 text-xs font-medium tabular-nums text-error-text ring-1 ring-inset ring-error-border">{report.total}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-border-strong p-3 text-sm">
        <a href={EXPORT_URL} className="flex h-10 items-center gap-3 rounded-xl px-3 text-foreground/70 transition-colors hover:bg-item-hover hover:text-foreground"><MenuIcon name="download" /> Xuất CSV</a>
        <div className="flex items-center justify-between gap-2 px-3 text-muted"><UserChip name={user.ten_dang_nhap} className="min-w-0" />{isAdmin && <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">admin</span>}</div>
        <button type="button" className={`w-full ${BUTTON_SECONDARY}`} onClick={logout}>Đăng xuất</button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      {open && sidebar}
      {open && narrow && <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center border-b border-border-strong bg-surface px-4">
          <button type="button" className={`${BUTTON_SECONDARY} !px-2.5`} onClick={() => setOpen(!open)} aria-label="Ẩn/hiện menu"><MenuIcon name="menu" /></button>
        </div>
        <main className="px-6 py-6">
          <Routes>
            <Route path="/" element={<TaskList />} />
            <Route path="/tasks/new" element={<TaskNew />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/cuoi-chieu" element={<EndOfDay />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/trang-thai" element={<RequireAdmin><StatusManager /></RequireAdmin>} />
            <Route path="/quan-ly-data" element={<RequireAdmin><DataManager /></RequireAdmin>} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/da-xoa" element={<RequireAdmin><DeletedTasks /></RequireAdmin>} />
            <Route path="/tai-khoan" element={<Accounts />} />
            <Route path="*" element={<p>Không tìm thấy trang.</p>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
