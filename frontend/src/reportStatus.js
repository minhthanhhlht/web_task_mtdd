// Tính nhãn "Cập nhật tiến độ" của một task theo quy tắc giờ chốt 16:30.
import { REPORT_CUTOFF_TIME } from './constants.js';

// Lớp Tailwind của từng mức nhãn (chỉ nhãn có màu, không tô nền dòng)
export const REPORT_LEVEL_CLASS = {
  early: 'bg-warning-bg text-warning ring-1 ring-inset ring-black/5',
  after: 'bg-success-bg text-success ring-1 ring-inset ring-black/5',
  unknown_time: 'bg-neutral-bg text-neutral ring-1 ring-inset ring-black/5',
  pending: 'bg-error-bg text-error-strong ring-1 ring-inset ring-error-border',
  late: 'bg-error-bg text-error-strong ring-1 ring-inset ring-error-border',
  missed: 'bg-error-bg text-error-strong ring-1 ring-inset ring-error-border',
};

// Ngày local dạng 'YYYY-MM-DD'
function toDateKey(date) {
  return date.toLocaleDateString('sv-SE');
}

// 'YYYY-MM-DD' → 'dd/mm'
function shortDate(dateKey) {
  return `${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}`;
}

// Số ngày giữa hai ngày 'YYYY-MM-DD'
function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000);
}

// Trả về { level, label, updatedToday, updatedAt? } cho một task tại thời điểm now
export function getReportStatus(task, now = new Date()) {
  const today = toDateKey(now);
  const nowTime = now.toLocaleTimeString('sv-SE').slice(0, 5);
  const last = task.ngay_cap_nhat_cuoi;
  if (last === today) {
    if (!task.gio_cap_nhat_cuoi) return { level: 'unknown_time', label: `Đã cập nhật ${shortDate(today)} (chưa có giờ)`, updatedToday: true };
    const updatedAt = String(task.gio_cap_nhat_cuoi).slice(0, 16);
    const level = updatedAt.slice(11, 16) < REPORT_CUTOFF_TIME ? 'early' : 'after';
    return { level, label: `Đã cập nhật lúc ${String(task.gio_cap_nhat_cuoi).slice(0, 19)}`, updatedToday: true, updatedAt, updatedAtFull: String(task.gio_cap_nhat_cuoi).slice(0, 19) };
  }
  const createdBeforeToday = String(task.tao_luc ?? '').slice(0, 10) < today;
  const yesterday = toDateKey(new Date(now.getTime() - 86400000));
  if (createdBeforeToday && (!last || last < yesterday)) {
    const label = last
      ? `Quá hạn cập nhật, lần cuối ${shortDate(last)} (${daysBetween(last, today)} ngày trước)`
      : 'Quá hạn cập nhật, chưa từng cập nhật';
    return { level: 'missed', label, updatedToday: false };
  }
  if (nowTime >= REPORT_CUTOFF_TIME) return { level: 'late', label: 'Chưa cập nhật', updatedToday: false };
  return { level: 'pending', label: `Chưa cập nhật (chốt lúc ${REPORT_CUTOFF_TIME})`, updatedToday: false };
}
