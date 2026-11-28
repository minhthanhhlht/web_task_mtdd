// Hằng số và tiện ích dùng chung toàn giao diện (phần kiểu dáng do Astryx lo, ở đây chỉ còn dữ liệu và hàm).

// Loại vấn đề và trạng thái vấn đề
export const ISSUE_TYPES = ['QnA', 'Process'];
export const ISSUE_STATUSES = ['Mở', 'Đã xử lý'];

// Người giao mặc định điền sẵn khi thêm task
export const DEFAULT_ASSIGNER = 'Ngo Hai Nhu';

// Tiền tố và mẫu của Số Pwire
export const TASK_CODE_PREFIX = 'PP000017-';
export const PWIRE_NUMBER_PATTERN = /^PP000017-\d+$/;
export const PWIRE_NUMBER_MESSAGE = 'Số Pwire phải bắt đầu bằng PP000017- và sau dấu - chỉ gồm chữ số, ví dụ PP000017-205779';
export const LINK_MESSAGE = 'Link Pwire phải là địa chỉ bắt đầu bằng http:// hoặc https://';

// Giờ chốt cập nhật tiến độ trong ngày
export const REPORT_CUTOFF_TIME = '16:30';

// Phân trang
export const PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

// Màu trạng thái: khóa → { nhãn tiếng Việt, biến thể Badge của Astryx }
export const STATUS_COLOR_OPTIONS = {
  gray: { label: 'Xám', variant: 'neutral' },
  blue: { label: 'Xanh dương', variant: 'blue' },
  orange: { label: 'Cam', variant: 'orange' },
  purple: { label: 'Tím', variant: 'purple' },
  green: { label: 'Xanh lá', variant: 'green' },
  red: { label: 'Đỏ', variant: 'red' },
  yellow: { label: 'Vàng', variant: 'yellow' },
};

// Địa chỉ hợp lệ là http/https
export function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value ?? '').trim());
}

// Chuẩn hóa ô Số Pwire: giữ tiền tố, không xóa được tiền tố, chỉ cho chữ số phía sau
export function sanitizePwireNumber(next, previous) {
  // Giá trị cũ không có tiền tố (dữ liệu cũ) thì cho gõ tự do
  if (previous && !previous.toUpperCase().startsWith(TASK_CODE_PREFIX) && !next.toUpperCase().startsWith(TASK_CODE_PREFIX)) return next;
  let rest = next;
  if (next.toUpperCase().startsWith(TASK_CODE_PREFIX)) rest = next.slice(TASK_CODE_PREFIX.length);
  else if (TASK_CODE_PREFIX.startsWith(next.toUpperCase())) rest = '';
  return TASK_CODE_PREFIX + rest.replace(/\D/g, '');
}

// Thời điểm hiện tại dạng 'YYYY-MM-DD HH:mm'
export function getNow() {
  return new Date().toLocaleString('sv-SE').slice(0, 16);
}

// 'YYYY-MM-DD HH:mm' hoặc 'YYYY-MM-DD' → 'YYYY-MM-DDTHH:mm' (giá trị của DateTimeInput)
export function toInputDateTime(value) {
  if (!value) return '';
  const text = String(value);
  return text.length === 10 ? `${text}T00:00` : `${text.slice(0, 10)}T${text.slice(11, 16)}`;
}

// 'YYYY-MM-DDTHH:mm' → 'YYYY-MM-DD HH:mm' (giá trị gửi API)
export function fromInputDateTime(value) {
  return value ? value.replace('T', ' ') : '';
}

// Hiển thị ngày giờ gọn: bỏ giây
export function formatDateTime(value) {
  return value ? String(value).slice(0, 19) : '—';
}
