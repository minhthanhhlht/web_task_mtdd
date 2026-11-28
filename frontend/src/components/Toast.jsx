// Thông báo nhanh: useToast().success|error|info(message), dựng trên toast của Astryx (LayerProvider quản lý vùng hiển thị).
import { useMemo, useRef } from 'react';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { useToast as useAstryxToast } from '@astryxdesign/core/Toast';

export function ToastProvider({ children }) {
  return <LayerProvider>{children}</LayerProvider>;
}

// Giữ một đối tượng ổn định giữa các lần render để component dùng trong deps của hook không bị chạy lại
export function useToast() {
  const show = useAstryxToast();
  const showRef = useRef(show);
  showRef.current = show;
  return useMemo(() => ({
    success: (message) => showRef.current({ body: message, autoHideDuration: 3500 }),
    info: (message) => showRef.current({ body: message, autoHideDuration: 3500 }),
    error: (message) => showRef.current({ body: message, type: 'error', isAutoHide: true, autoHideDuration: 6000 }),
  }), []);
}
