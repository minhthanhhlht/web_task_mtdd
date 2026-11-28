// Chế độ giao diện sáng / tối / theo hệ thống: nhớ trong localStorage, áp dụng qua prop mode của Theme (Astryx).
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { defaultThemeSlug, themes } from '../astryx-themes.js';

const STORAGE_KEY = 'themeMode';
const MODES = ['light', 'dark', 'system'];
const ThemeModeContext = createContext({ mode: 'light', setMode: () => {} });

// Đọc chế độ đã lưu (mặc định sáng); bọc try/catch phòng trình duyệt chặn localStorage
function readMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(saved) ? saved : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeModeProvider({ children }) {
  const [mode, setModeState] = useState(readMode);
  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* bỏ qua: chỉ mất việc ghi nhớ */ }
  }, []);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return (
    <ThemeModeContext.Provider value={value}>
      <Theme theme={themes[defaultThemeSlug]} mode={mode}>{children}</Theme>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
