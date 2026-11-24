// Biểu tượng SVG nội tuyến (outline 24×24, nét mảnh, màu theo currentColor) dùng cho menu và nút.
const PATHS = {
  list: 'M4 6h16M4 12h16M4 18h16',
  plus: 'M12 5v14M5 12h14',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  check: 'M5 12l5 5L20 7',
  tag: 'M3 12V4h8l10 10-8 8L3 12zm5-4h.01',
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  users: 'M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  'arrow-up': 'M12 19V5m0 0l-6 6m6-6l6 6',
  'arrow-down': 'M12 5v14m0 0l6-6m-6 6l-6-6',
  'arrow-left': 'M19 12H5m0 0l6-6m-6 6l6 6',
  clock: 'M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  more: 'M4 12h2M11 12h2M18 12h2',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  key: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3',
  undo: 'M3 7v6h6M3 13a9 9 0 103-7l-3 1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  info: 'M12 8h.01M11 12h1v5h1M12 22a10 10 0 100-20 10 10 0 000 20z',
  alert: 'M12 8v5m0 3h.01M12 22a10 10 0 100-20 10 10 0 000 20z',
  'circle-check': 'M9 12l2 2 4-4m7 2a10 10 0 11-20 0 10 10 0 0120 0z',
  'sort-none': 'M8 9l4-4 4 4M16 15l-4 4-4-4',
  'sort-up': 'M8 15l4-4 4 4',
  'sort-down': 'M8 9l4 4 4-4',
};

// Vẽ một biểu tượng theo tên; className chỉnh kích thước (mặc định 20px)
export default function MenuIcon({ name, className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
