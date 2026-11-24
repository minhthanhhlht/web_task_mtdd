// Thanh phân trang: tổng số, chọn số dòng/trang, nút ‹ 1 2 3 … › (trang hiện tại nền đen).
import { BUTTON_ICON, INPUT_CLASS, PAGE_SIZE_OPTIONS } from '../constants.js';
import MenuIcon from './MenuIcon.jsx';

// Tạo dãy số trang gọn: đầu, cuối, trang hiện tại ± 1, '…' ở khoảng trống
function buildPages(page, totalPages) {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const result = [];
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) result.push('…');
    result.push(n);
  });
  return result;
}

export default function Pagination({ total, page, limit, unit = 'task', onChangePage, onChangeLimit }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span className="tabular-nums">{total} {unit} · trang {page}/{totalPages}</span>
      <div className="flex flex-wrap items-center gap-2">
        {onChangeLimit && (
          <label className="flex items-center gap-2">
            Số {unit}/trang
            <select name="so_dong_moi_trang" className={INPUT_CLASS} value={limit} onChange={(event) => onChangeLimit(Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        )}
        <nav className="flex items-center gap-1" aria-label="Phân trang">
          <button type="button" className={BUTTON_ICON} aria-label="Trang trước" disabled={page <= 1} onClick={() => onChangePage(page - 1)}>
            <MenuIcon name="chevron-left" className="size-4" />
          </button>
          {buildPages(page, totalPages).map((item, index) => (item === '…'
            ? <span key={`gap-${index}`} className="px-1">…</span>
            : (
              <button
                key={item}
                type="button"
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onChangePage(item)}
                className={`inline-flex size-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors ${item === page ? 'bg-primary font-medium text-primary-foreground' : 'text-foreground hover:bg-item-hover'}`}
              >
                {item}
              </button>
            )))}
          <button type="button" className={BUTTON_ICON} aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onChangePage(page + 1)}>
            <MenuIcon name="chevron-right" className="size-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
