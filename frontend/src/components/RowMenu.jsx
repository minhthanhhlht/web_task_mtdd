// Menu "…" của một dòng (MoreMenu của Astryx): items = [{ label, icon, danger, disabled, onClick }]; icon là tên: edit | trash | key.
import { Icon } from '@astryxdesign/core/Icon';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { KeyRound, Pencil, Trash2 } from 'lucide-react';

const ICONS = { edit: Pencil, trash: Trash2, key: KeyRound };

export default function RowMenu({ items }) {
  return (
    <MoreMenu
      label="Thao tác"
      size="sm"
      placement="below"
      alignment="end"
      items={items.map((item) => ({
        label: item.label,
        icon: ICONS[item.icon] ? <Icon icon={ICONS[item.icon]} /> : undefined,
        variant: item.danger ? 'destructive' : 'default',
        isDisabled: item.disabled,
        onClick: item.onClick,
      }))}
    />
  );
}
