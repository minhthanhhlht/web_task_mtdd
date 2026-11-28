// Thông báo trạng thái tải dữ liệu: Loading và ErrorBox (có nút Thử lại).
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Spinner } from '@astryxdesign/core/Spinner';

// Vòng quay Đang tải ở giữa: fullPage = giữa cả vùng nội dung (khi chờ tải cả trang), mặc định = giữa dòng (khi tải thêm dưới bảng)
export function Loading({ fullPage = false }) {
  return (
    <div className={`flex items-center justify-center ${fullPage ? 'min-h-[60vh]' : 'py-4'}`}>
      <Spinner size="md" label="Đang tải..." />
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <Banner
      status="error"
      title={message}
      endContent={onRetry ? <Button label="Thử lại" onClick={onRetry} /> : undefined}
    />
  );
}
