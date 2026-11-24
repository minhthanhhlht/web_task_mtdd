// Thanh tiến độ đổi màu theo mức: <30 đỏ, 30-59 cam, 60-99 xanh dương, 100 xanh lá.
export default function ProgressBar({ value }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  let color = 'bg-red-500';
  if (percent >= 100) color = 'bg-emerald-500';
  else if (percent >= 60) color = 'bg-blue-500';
  else if (percent >= 30) color = 'bg-amber-500';
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-14 rounded-full bg-secondary">
        <span className={`block h-1.5 rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </span>
      <span className="w-8 text-xs tabular-nums text-muted">{percent}%</span>
    </span>
  );
}
