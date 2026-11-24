// Danh sách trạng thái task dùng chung toàn ứng dụng.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listStatuses } from '../api.js';

const StatusContext = createContext(null);

export function StatusProvider({ children }) {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tải (hoặc tải lại) danh sách trạng thái
  const reload = useCallback(async () => {
    try {
      const data = await listStatuses();
      setStatuses(data.items);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const value = useMemo(() => ({
    statuses,
    activeStatuses: statuses.filter((s) => !s.la_hoan_thanh),
    getStatus: (name) => statuses.find((s) => s.ten.toLowerCase() === String(name).toLowerCase()),
    reload, loading, error,
  }), [statuses, reload, loading, error]);

  return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>;
}

export function useStatuses() {
  return useContext(StatusContext);
}
