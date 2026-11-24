// Thông báo trạng thái tải dữ liệu: Loading và ErrorBox (có nút Thử lại).
import { BUTTON_SECONDARY } from '../constants.js';

export function Loading() {
  return <p className="py-4 text-sm text-muted">Đang tải...</p>;
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">
      <span>{message}</span>
      {onRetry && <button type="button" className={BUTTON_SECONDARY} onClick={onRetry}>Thử lại</button>}
    </div>
  );
}
