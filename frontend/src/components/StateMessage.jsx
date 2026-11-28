// Thông báo trạng thái tải dữ liệu: Loading và ErrorBox (có nút Thử lại).
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Spinner } from '@astryxdesign/core/Spinner';

export function Loading() {
  return <div className="py-4"><Spinner size="md" label="Đang tải..." /></div>;
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
