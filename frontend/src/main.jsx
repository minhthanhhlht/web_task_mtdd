// Điểm vào của giao diện: dựng các provider theo đúng thứ tự rồi hiển thị App.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import AuthGate from './components/AuthGate.jsx';
import { DialogProvider } from './components/DialogContext.jsx';
import { StatusProvider } from './components/StatusContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </StrictMode>,
);
