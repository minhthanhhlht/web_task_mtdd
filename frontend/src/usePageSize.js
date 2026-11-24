// Hook nhớ số dòng mỗi trang trong localStorage.
import { useState } from 'react';
import { PAGE_SIZE, PAGE_SIZE_OPTIONS } from './constants.js';

export default function usePageSize() {
  const [limit, setLimit] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('pageSize'));
      return PAGE_SIZE_OPTIONS.includes(saved) ? saved : PAGE_SIZE;
    } catch {
      return PAGE_SIZE;
    }
  });
  // Đổi số dòng/trang và lưu lại
  const changeLimit = (value) => {
    setLimit(value);
    try { localStorage.setItem('pageSize', String(value)); } catch { /* bỏ qua nếu không ghi được */ }
  };
  return [limit, changeLimit];
}
