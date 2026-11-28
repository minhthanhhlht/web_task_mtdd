// Một mục checklist: ô tick + tên mục, hiện giờ hoàn thành khi đã xong.
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { formatDateTime } from '../constants.js';

export default function ChecklistBox({ item, onToggle, disabled }) {
  return (
    <CheckboxInput
      label={item.ten_muc}
      description={item.da_xong && item.xong_luc ? `xong lúc ${formatDateTime(item.xong_luc)}` : undefined}
      value={Boolean(item.da_xong)}
      isDisabled={disabled}
      onChange={(checked) => onToggle(item, checked)}
    />
  );
}
