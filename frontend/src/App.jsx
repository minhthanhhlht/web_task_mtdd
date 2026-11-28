// Khung ứng dụng: AppShell của Astryx (menu bên tự chuyển thành ngăn kéo trên màn hẹp) và các route.
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Selector } from '@astryxdesign/core/Selector';
import { SideNav, SideNavHeading, SideNavItem } from '@astryxdesign/core/SideNav';
import { Text } from '@astryxdesign/core/Text';
import {
  Archive, ChartColumn, CircleCheck, Database, Download, ListTodo, LogOut, Monitor, Moon, Plus, Sun, Tag, Trash2, Users,
} from 'lucide-react';
import { EXPORT_URL } from './api.js';
import { useAuth } from './components/AuthContext.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import { useThemeMode } from './components/ThemeModeContext.jsx';
import UserChip from './components/UserChip.jsx';
import Accounts from './pages/Accounts.jsx';
import Archive_ from './pages/Archive.jsx';
import Checklist from './pages/Checklist.jsx';
import DataManager from './pages/DataManager.jsx';
import DeletedTasks from './pages/DeletedTasks.jsx';
import EndOfDay from './pages/EndOfDay.jsx';
import StatusManager from './pages/StatusManager.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import TaskList from './pages/TaskList.jsx';
import TaskNew from './pages/TaskNew.jsx';
import useReportSummary from './useReportSummary.js';

// Danh sách menu: [đường dẫn, nhãn, icon, chỉ admin, khớp đúng đường dẫn]
const MENU = [
  ['/', 'Đang xử lý', ListTodo, false, true],
  ['/tasks/new', 'Thêm task', Plus, false],
  ['/cuoi-chieu', 'Cập nhật tiến độ', ChartColumn, false],
  ['/checklist', 'Checklist', CircleCheck, false],
  ['/trang-thai', 'Quản lý trạng thái', Tag, true],
  ['/quan-ly-data', 'Quản lý data', Database, true],
  ['/archive', 'Đã hoàn thành', Archive, false],
  ['/da-xoa', 'Task đã xóa', Trash2, true],
  ['/tai-khoan', 'Tài khoản', Users, false],
];

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const report = useReportSummary(location.pathname);
  const isAdmin = user.vai_tro === 'admin';
  const { mode, setMode } = useThemeMode();

  const isSelected = (to, end) => (end ? location.pathname === to : location.pathname === to || location.pathname.startsWith(`${to}/`));

  const sideNav = (
    <SideNav
      aria-label="Menu chính"
      header={<SideNavHeading heading="Quản lý task" />}
      footer={(
        <div className="flex flex-col gap-2 p-2">
          <SideNavItem label="Xuất CSV" icon={<Icon icon={Download} />} onClick={() => window.location.assign(EXPORT_URL)} />
          <div className="flex items-center justify-between gap-2 px-2">
            <UserChip name={user.ten_dang_nhap} />
            {isAdmin && <Badge variant="info" label="admin" />}
          </div>
          <Selector
            label="Giao diện" isLabelHidden variant="secondary" value={mode} width="100%" startIcon={<Icon icon={mode === 'dark' ? Moon : mode === 'system' ? Monitor : Sun} />}
            options={[{ value: 'light', label: 'Giao diện sáng' }, { value: 'dark', label: 'Giao diện tối' }, { value: 'system', label: 'Theo hệ thống' }]}
            onChange={(v) => v && setMode(v)}
          />
          <Button label="Đăng xuất" icon={<Icon icon={LogOut} />} onClick={logout} width="100%" />
        </div>
      )}
    >
      {MENU.filter((item) => !item[3] || isAdmin).map(([to, label, IconComponent, , end]) => (
        <SideNavItem
          key={to}
          href={to}
          label={label}
          icon={<Icon icon={IconComponent} />}
          isSelected={isSelected(to, end)}
          endContent={to === '/cuoi-chieu' && report.total > 0 ? <Badge variant="error" label={String(report.total)} /> : undefined}
        />
      ))}
    </SideNav>
  );

  return (
    <AppShell sideNav={sideNav} contentPadding={4}>
      <Routes>
        <Route path="/" element={<TaskList />} />
        <Route path="/tasks/new" element={<TaskNew />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/cuoi-chieu" element={<EndOfDay />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/trang-thai" element={<RequireAdmin><StatusManager /></RequireAdmin>} />
        <Route path="/quan-ly-data" element={<RequireAdmin><DataManager /></RequireAdmin>} />
        <Route path="/archive" element={<Archive_ />} />
        <Route path="/da-xoa" element={<RequireAdmin><DeletedTasks /></RequireAdmin>} />
        <Route path="/tai-khoan" element={<Accounts />} />
        <Route path="*" element={<Text>Không tìm thấy trang.</Text>} />
      </Routes>
    </AppShell>
  );
}
