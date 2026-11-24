// Menu "…" cho hành động trong dòng bảng/danh sách (3 hành động trở lên hoặc có xóa).
// Mở bằng vị trí cố định (fixed) để không bị khung cuộn ngang của bảng cắt mất.
import { useEffect, useRef, useState } from 'react';
import { BUTTON_ICON } from '../constants.js';
import MenuIcon from './MenuIcon.jsx';

// items: [{ label, icon, onClick, danger, disabled, title }]
export default function RowMenu({ items, label = 'Thao tác' }) {
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Đóng khi bấm ra ngoài, nhấn Esc hoặc cuộn trang
  useEffect(() => {
    if (!position) return undefined;
    const close = () => setPosition(null);
    const onDown = (event) => {
      if (menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      close();
    };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [position]);

  // Mở menu ngay dưới nút, căn mép phải; nếu sát đáy màn thì mở lên trên
  const toggle = (event) => {
    event.stopPropagation();
    if (position) { setPosition(null); return; }
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = items.length * 36 + 8;
    const top = rect.bottom + menuHeight > window.innerHeight ? rect.top - menuHeight - 4 : rect.bottom + 4;
    // Căn mép phải theo nút, nhưng không để tràn khỏi mép màn (menu rộng 192px)
    const left = Math.min(Math.max(8, rect.right - 192), window.innerWidth - 192 - 8);
    setPosition({ top, left });
  };

  return (
    <>
      <button ref={buttonRef} type="button" className={BUTTON_ICON} aria-label={label} aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={toggle}>
        <MenuIcon name="more" className="size-5" />
      </button>
      {position && (
        <div ref={menuRef} role="menu" style={{ top: position.top, left: position.left }} className="fixed z-40 w-48 rounded-xl border border-border-strong bg-surface-overlay p-1 shadow-popover">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.title}
              onClick={(event) => { event.stopPropagation(); setPosition(null); item.onClick(); }}
              className={`flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${item.danger ? 'text-foreground hover:bg-danger-bg hover:text-danger' : 'text-foreground hover:bg-item-hover'}`}
            >
              {item.icon && <MenuIcon name={item.icon} className="size-4" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
