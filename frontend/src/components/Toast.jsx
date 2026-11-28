// Thông báo nhanh: useToast().success|error|info(message), dựng trên toast của Astryx (LayerProvider quản lý vùng hiển thị).
import { useMemo, useRef } from 'react';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { Icon } from '@astryxdesign/core/Icon';
import { useToast as useAstryxToast } from '@astryxdesign/core/Toast';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';

export function ToastProvider({ children }) {
  // Toast hiện ở góc trên bên phải
  return <LayerProvider toast={{ position: 'topEnd' }}>{children}</LayerProvider>;
}

// Nội dung toast: icon + chữ; data-toast-kind để index.css tô màu riêng (Astryx chỉ có hai loại info/error nên thành công đi qua info)
function body(kind, icon, message) {
  return <span className="inline-flex items-center gap-2" data-toast-kind={kind}><Icon icon={icon} size="sm" />{message}</span>;
}

// Giữ một đối tượng ổn định giữa các lần render để component dùng trong deps của hook không bị chạy lại
export function useToast() {
  const show = useAstryxToast();
  const showRef = useRef(show);
  showRef.current = show;
  return useMemo(() => ({
    success: (message) => showRef.current({ body: body('success', CircleCheck, message), autoHideDuration: 3500 }),
    info: (message) => showRef.current({ body: body('info', Info, message), autoHideDuration: 3500 }),
    error: (message) => showRef.current({ body: body('error', CircleAlert, message), type: 'error', isAutoHide: true, autoHideDuration: 6000 }),
  }), []);
}
