// Checkbox "Chọn tất cả" 3 trạng thái (tick / không tick / lưng chừng).
import { useEffect, useRef } from 'react';

export default function SelectAllCheckbox({ checked, indeterminate, onChange, label = 'Chọn tất cả', disabled }) {
  const ref = useRef(null);
  // indeterminate chỉ đặt được qua thuộc tính DOM
  useEffect(() => { if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked; }, [indeterminate, checked]);
  return (
    <label className="flex items-center gap-2 text-sm">
      <input ref={ref} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
