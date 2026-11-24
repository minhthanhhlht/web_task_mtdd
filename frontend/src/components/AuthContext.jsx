// Ngữ cảnh người dùng đang đăng nhập: user, reload, logout.
import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}
