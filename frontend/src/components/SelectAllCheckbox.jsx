// Checkbox "Chọn tất cả" 3 trạng thái (tick / không tick / lưng chừng).
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';

export default function SelectAllCheckbox({ checked, indeterminate, onChange, label = 'Chọn tất cả', disabled }) {
  return (
    <CheckboxInput
      label={label}
      value={indeterminate && !checked ? 'indeterminate' : Boolean(checked)}
      isDisabled={disabled}
      onChange={(next) => onChange(next)}
    />
  );
}
