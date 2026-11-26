// Ô nhập mật khẩu có nút ẩn/hiện (con mắt) ở bên phải; mọi prop còn lại chuyển cho thẻ input.
import { useState } from 'react';
import MenuIcon from './MenuIcon.jsx';

export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-10`} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted hover:text-foreground"
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        <MenuIcon name={visible ? 'eye-off' : 'eye'} className="size-4" />
      </button>
    </div>
  );
}
