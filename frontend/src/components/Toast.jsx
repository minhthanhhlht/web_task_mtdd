// Thông báo nhanh (toast) ở góc phải trên: useToast().success|error|info(message).
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import MenuIcon from './MenuIcon.jsx';

const ToastContext = createContext(null);

// Biểu tượng và màu của từng loại toast (nền lớp nổi trắng, viền mảnh, chỉ biểu tượng mang màu trạng thái)
const TOAST_STYLE = {
  success: { icon: 'circle-check', color: 'text-success' },
  error: { icon: 'alert', color: 'text-error-text' },
  info: { icon: 'info', color: 'text-muted' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  // Đóng một toast
  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  // Thêm toast và tự ẩn sau 3500 ms (lỗi 6000 ms)
  const push = useCallback((type, message) => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-50 w-80 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="flex items-start gap-3 rounded-xl border border-border-strong bg-surface-overlay px-3 py-3 text-sm shadow-popover">
            <span className={`mt-0.5 ${TOAST_STYLE[toast.type].color}`}><MenuIcon name={TOAST_STYLE[toast.type].icon} className="size-4" /></span>
            <span className="flex-1 break-words">{toast.message}</span>
            <button type="button" className="text-muted transition-colors hover:text-foreground" onClick={() => dismiss(toast.id)} aria-label="Đóng"><MenuIcon name="close" className="size-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
