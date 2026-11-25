// Hằng số và tiện ích dùng chung toàn giao diện.

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

// Màu trạng thái: khóa → { nhãn tiếng Việt, lớp Tailwind của huy hiệu dạng pill }
export const STATUS_COLOR_OPTIONS = {
  gray: { label: 'Xám', className: 'bg-zinc-100 text-zinc-600' },
  blue: { label: 'Xanh dương', className: 'bg-blue-50 text-blue-700' },
  orange: { label: 'Cam', className: 'bg-orange-50 text-orange-700' },
  purple: { label: 'Tím', className: 'bg-violet-50 text-violet-700' },
  green: { label: 'Xanh lá', className: 'bg-emerald-50 text-emerald-700' },
  red: { label: 'Đỏ', className: 'bg-red-50 text-red-700' },
  yellow: { label: 'Vàng', className: 'bg-amber-50 text-amber-700' },
};

// Kiểu bảng: đường kẻ ngang mảnh giữa các dòng, tiêu đề chữ mờ (không viền từng ô)
export const TABLE_BORDER_CLASS = 'border-collapse [&_tbody_tr]:border-t [&_tbody_tr]:border-border [&_th]:font-medium [&_th]:text-muted';

// Bo góc: ≥ 40px cao dùng rounded-xl, ≤ 36px dùng rounded-lg, thẻ/modal rounded-2xl
// Ô nhập: viền chức năng, focus đổi viền + vòng mờ
export const INPUT_CLASS = 'h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus-ring';
// Nút chính: nền đặc xanh dương cho hành động quan trọng nhất
export const BUTTON_PRIMARY = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50';
// Nút mặc định: viền + chữ
export const BUTTON_SECONDARY = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border-strong bg-surface px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-button-hover disabled:opacity-50';
// Nút nhỏ trong dòng bảng
export const BUTTON_SMALL = 'inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border-strong bg-surface px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-button-hover disabled:opacity-50';
// Nút phá hủy: nền rose nhạt luôn hiện, không viền đỏ
export const BUTTON_DANGER = 'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-danger-bg px-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger-bg-hover disabled:opacity-50';
// Nút chỉ có icon: vuông 36px (nhớ aria-label)
export const BUTTON_ICON = 'inline-flex size-9 items-center justify-center rounded-lg border border-border-strong bg-surface text-foreground transition-colors hover:bg-button-hover disabled:opacity-50';
// Thẻ: nền trắng, viền 1px, không đổ bóng
export const CARD_CLASS = 'rounded-2xl border border-border bg-surface p-5';
// Khung bảng: viền + bo góc, nội dung cuộn ngang
export const TABLE_WRAP_CLASS = 'overflow-x-auto rounded-xl border border-border-strong bg-surface';
// Thông báo lỗi dạng khung
export const ERROR_BOX_CLASS = 'rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text';

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
