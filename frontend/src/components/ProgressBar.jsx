// Thanh tiến độ đổi màu theo mức: <30 đỏ, 30-59 cam, 60-99 xanh dương, 100 xanh lá.
import { ProgressBar as AstryxProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';

export default function ProgressBar({ value }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  let variant = 'error';
  if (percent >= 100) variant = 'success';
  else if (percent >= 60) variant = 'accent';
  else if (percent >= 30) variant = 'warning';
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block w-16"><AstryxProgressBar label="Tiến độ" isLabelHidden value={percent} variant={variant} /></span>
      <Text size="xsm" color="secondary"><span className="tabular-nums">{percent}%</span></Text>
    </span>
  );
}
