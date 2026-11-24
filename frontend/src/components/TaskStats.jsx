// Ba thẻ số liệu đầu trang "Đang xử lý": ô icon theo loại (sắc phân loại cat-1..3), số cần chú ý đổi màu cảnh báo.
import { useEffect, useState } from 'react';
import { listTasks } from '../api.js';
import MenuIcon from './MenuIcon.jsx';

// Một thẻ: ô icon tô sắc + nhãn + con số
function StatCard({ icon, tone, label, value, alert }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><MenuIcon name={icon} className="size-5" /></span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className={`text-2xl font-semibold tabular-nums ${alert ? 'text-warning' : 'text-foreground'}`}>{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function TaskStats({ reportTotal }) {
  const [counts, setCounts] = useState({ active: null, done: null });

  // Đếm task đang xử lý và đã hoàn thành (không lọc), tải lại khi dữ liệu tiến độ đổi
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([listTasks({ page: 1, limit: 1 }), listTasks({ page: 1, limit: 1, archived: true })])
        .then(([active, done]) => { if (!cancelled) setCounts({ active: active.total, done: done.total }); })
        .catch(() => { if (!cancelled) setCounts({ active: null, done: null }); });
    };
    load();
    window.addEventListener('report-changed', load);
    return () => { cancelled = true; window.removeEventListener('report-changed', load); };
  }, []);

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard icon="list" tone="bg-cat-1/10 text-cat-1" label="Đang xử lý" value={counts.active} />
      <StatCard icon="clock" tone="bg-cat-2/10 text-cat-2" label="Cần cập nhật tiến độ" value={reportTotal} alert={reportTotal > 0} />
      <StatCard icon="circle-check" tone="bg-cat-3/10 text-cat-3" label="Đã hoàn thành" value={counts.done} />
    </div>
  );
}
