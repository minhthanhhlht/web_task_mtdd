// Điểm vào của giao diện: dựng các provider theo đúng thứ tự rồi hiển thị App.
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import viVN from '@astryxdesign/core/locales/vi-VN.generated.js';
import { LinkProvider } from '@astryxdesign/core/Link';
import App from './App.jsx';
import AuthGate from './components/AuthGate.jsx';
import { DialogProvider } from './components/DialogContext.jsx';
import RouterLink from './components/RouterLink.jsx';
import { StatusProvider } from './components/StatusContext.jsx';
import { ThemeModeProvider } from './components/ThemeModeContext.jsx';
import { ToastProvider } from './components/Toast.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Theme (sáng/tối/hệ thống) và ngôn ngữ của Astryx (nhãn nội bộ của component hiển thị tiếng Việt); Link dùng router của ứng dụng */}
      <ThemeModeProvider>
        <InternationalizationProvider locale="vi-VN" messages={{ 'vi-VN': viVN }}>
          <LinkProvider component={RouterLink}>
            <ToastProvider>
              <DialogProvider>
                {/* AuthProvider: ngữ cảnh đăng nhập do AuthGate cung cấp sau khi hỏi /api/auth/me */}
                <AuthGate>
                  <StatusProvider>
                    <App />
                  </StatusProvider>
                </AuthGate>
              </DialogProvider>
            </ToastProvider>
          </LinkProvider>
        </InternationalizationProvider>
      </ThemeModeProvider>
    </BrowserRouter>
  </StrictMode>,
);
