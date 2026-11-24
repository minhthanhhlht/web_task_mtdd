// Hook lấy danh sách mục của một nhóm dữ liệu (vd 'dev') từ /api/data-groups.
import { useEffect, useState } from 'react';
import { listDataGroups } from './api.js';

export default function useDataItems(group) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let cancelled = false;
    listDataGroups()
      .then((data) => { if (!cancelled) setItems(data.groups.find((g) => g.key === group)?.items ?? []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [group]);
  return { items };
}
