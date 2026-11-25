// Hook đếm task chưa cập nhật tiến độ hôm nay (dùng cho thanh nhắc và chấm đỏ ở menu).
import { useCallback, useEffect, useState } from 'react';
import { listTasks } from './api.js';
import { REPORT_CUTOFF_TIME } from './constants.js';
import { getReportStatus } from './reportStatus.js';

// Báo cho mọi nơi biết dữ liệu cập nhật tiến độ đã đổi
export function notifyReportChanged() {
  window.dispatchEvent(new Event('report-changed'));
}

export default function useReportSummary(reloadKey) {
  const [tasks, setTasks] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [version, setVersion] = useState(0);

  // Tải lại thủ công (sau khi "Không đổi" / lưu tiến độ)
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  // Mọi nơi đã lưu tiến độ sẽ bắn sự kiện này để thanh nhắc và chấm đỏ cùng cập nhật
  useEffect(() => {
    window.addEventListener('report-changed', reload);
    return () => window.removeEventListener('report-changed', reload);
  }, [reload]);

  // Tải tối đa 200 task chưa cập nhật hôm nay
  useEffect(() => {
    let cancelled = false;
    listTasks({ notUpdated: true, page: 1, limit: 200 })
      .then((data) => { if (!cancelled) setTasks(data.items); })
      .catch(() => { if (!cancelled) setTasks([]); });
    return () => { cancelled = true; };
  }, [reloadKey, version]);

  // Đồng hồ cập nhật mỗi phút để nhãn đổi khi qua giờ chốt
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const afterCutoff = now.toLocaleTimeString('sv-SE').slice(0, 5) >= REPORT_CUTOFF_TIME;
  const missed = tasks.filter((t) => getReportStatus(t, now).level === 'missed').length;
  // Đếm mọi task chưa cập nhật hôm nay, kể cả trước giờ chốt (giờ chốt chỉ ảnh hưởng màu nhãn và câu chữ)
  const total = tasks.length;
  return { total, missed, now, afterCutoff, reload };
}
