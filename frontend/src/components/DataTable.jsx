// Bảng của Astryx: mỗi ô một dòng (chữ dài bị cắt bằng "…"), vừa khít chiều ngang, chỉ cuộn ngang khi màn quá hẹp so với minWidth.
// Bảng Astryx tràn ra hai bên 16px (-16px margin) nên khung bọc bù lại bằng margin âm + padding để không sinh thanh cuộn thừa.
import { Table } from '@astryxdesign/core/Table';

export default function DataTable({ minWidth = 0, ...props }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div style={{ minWidth }}>
        <Table textOverflow="truncate" {...props} />
      </div>
    </div>
  );
}
