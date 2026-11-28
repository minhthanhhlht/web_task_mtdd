// Ba thẻ số liệu đầu trang "Đang xử lý": đang xử lý, cần cập nhật tiến độ, đã hoàn thành.
import { useEffect, useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { CircleCheck, Clock, ListTodo } from 'lucide-react';
import { listTasks } from '../api.js';

// Một thẻ: icon + nhãn + con số (số cần chú ý đổi màu cảnh báo)
function StatCard({ icon, label, value, alert }) {
  return (
    <Card padding={3}>
      <div className="flex items-center gap-3">
        <Icon icon={icon} size="lg" color={alert ? 'warning' : undefined} />
        <div className="min-w-0">
          <Text type="supporting" color="secondary" display="block">{label}</Text>
          <Text size="2xl" weight="semibold" display="block"><span className={alert ? 'text-(--color-text-warning)' : ''}>{value ?? '—'}</span></Text>
        </div>
      </div>
    </Card>
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
      <StatCard icon={ListTodo} label="Đang xử lý" value={counts.active} />
      <StatCard icon={Clock} label="Cần cập nhật tiến độ" value={reportTotal} alert={reportTotal > 0} />
      <StatCard icon={CircleCheck} label="Đã hoàn thành" value={counts.done} />
    </div>
  );
}
