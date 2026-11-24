// Ô ngày giờ một ô 'YYYY-MM-DD HH:mm' (24 giờ) có bảng lịch. Giá trị vào/ra: 'YYYY-MM-DDTHH:mm' hoặc ''.
import MenuIcon from './MenuIcon.jsx';
import { useEffect, useRef, useState } from 'react';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, getNow, INPUT_CLASS } from '../constants.js';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DDTHH:mm' → 'YYYY-MM-DD HH:mm'
const toDisplay = (value) => (value ? value.replace('T', ' ') : '');

// Đọc chuỗi nhập tay; trả { y, m, d, h, mi } nếu đủ và là ngày giờ có thật, không thì null
function parseText(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [y, m, d, h, mi] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d || h > 23 || mi > 59) return null;
  return { y, m, d, h, mi };
}

const toValue = ({ y, m, d, h, mi }) => `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(mi)}`;

export default function DateTimeInput({ value, onChange, clearable = false, hasError = false, id }) {
  const [text, setText] = useState(toDisplay(value));
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  // Phần ngày giờ đang chọn (dùng khi chưa có giá trị thì lấy giờ hiện tại)
  const current = parseText(toDisplay(value)) ?? parseText(getNow()) ;
  const [view, setView] = useState({ y: current.y, m: current.m });

  // Đồng bộ ô chữ khi giá trị bên ngoài đổi
  useEffect(() => { setText(toDisplay(value)); }, [value]);

  // Đóng bảng khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // Gõ trực tiếp: chỉ báo ra ngoài khi đủ và hợp lệ
  const handleType = (event) => {
    const next = event.target.value;
    setText(next);
    const parsed = parseText(next);
    if (parsed) onChange(toValue(parsed));
    else if (next === '' && clearable) onChange('');
  };

  // Rời ô mà còn dở dang thì trả về giá trị cũ
  const handleBlur = () => { if (!parseText(text) && !(text === '' && clearable)) setText(toDisplay(value)); };

  const selected = parseText(toDisplay(value));
  // Chọn một ngày trên lịch, giữ nguyên giờ đã chọn
  const pickDay = (day) => onChange(toValue({ y: view.y, m: view.m, d: day, h: current.h, mi: current.mi }));
  const setTime = (patch) => onChange(toValue({ ...(selected ?? { y: view.y, m: view.m, d: current.d }), h: current.h, mi: current.mi, ...patch }));
  const openPanel = () => { setView({ y: current.y, m: current.m }); setOpen(true); };

  // Các ô ngày của tháng đang xem (tuần bắt đầu thứ Hai)
  const firstWeekday = (new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = parseText(getNow());
  const shiftMonth = (delta) => {
    const index = view.y * 12 + (view.m - 1) + delta;
    setView({ y: Math.floor(index / 12), m: (index % 12) + 1 });
  };

  return (
    <div className="relative" ref={rootRef}>
      <input
        id={id}
        type="text"
        value={text}
        placeholder="Chọn ngày giờ"
        onChange={handleType}
        onBlur={handleBlur}
        onClick={openPanel}
        className={`w-full ${INPUT_CLASS} pr-8 ${hasError ? 'border-red-500' : ''}`}
      />
      <button type="button" className="absolute right-1 inset-y-0 my-auto flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-item-hover" onClick={openPanel} aria-label="Mở lịch"><MenuIcon name="calendar" className="size-4" /></button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 w-64 rounded-xl border border-border-strong bg-surface-overlay p-3 shadow-popover">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            <button type="button" className="flex size-7 items-center justify-center rounded-lg hover:bg-item-hover" aria-label="Tháng trước" onClick={() => shiftMonth(-1)}><MenuIcon name="chevron-left" className="size-4" /></button>
            <span>Tháng {view.m}/{view.y}</span>
            <button type="button" className="flex size-7 items-center justify-center rounded-lg hover:bg-item-hover" aria-label="Tháng sau" onClick={() => shiftMonth(1)}><MenuIcon name="chevron-right" className="size-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
            {cells.map((day, index) => {
              if (day === null) return <span key={`e${index}`} />;
              const isSelected = selected && selected.y === view.y && selected.m === view.m && selected.d === day;
              const isToday = today.y === view.y && today.m === view.m && today.d === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`rounded-lg py-1 text-foreground ${isSelected ? 'bg-primary !text-primary-foreground' : 'hover:bg-item-hover'} ${isToday ? 'border border-border-strong font-semibold' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm">
            <select className={INPUT_CLASS} value={current.h} onChange={(event) => setTime({ h: Number(event.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad(h)}</option>)}
            </select>
            :
            <select className={INPUT_CLASS} value={current.mi} onChange={(event) => setTime({ mi: Number(event.target.value) })}>
              {Array.from({ length: 60 }, (_, m) => <option key={m} value={m}>{pad(m)}</option>)}
            </select>
            <button type="button" className={`${BUTTON_SECONDARY} ml-auto`} onClick={() => { const now = parseText(getNow()); onChange(toValue(now)); setView({ y: now.y, m: now.m }); }}>Bây giờ</button>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            {clearable && value && <button type="button" className={BUTTON_SECONDARY} onClick={() => { onChange(''); setOpen(false); }}>Xóa</button>}
            <button type="button" className={BUTTON_PRIMARY} onClick={() => setOpen(false)}>Xong</button>
          </div>
        </div>
      )}
    </div>
  );
}
