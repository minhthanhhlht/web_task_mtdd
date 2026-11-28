// Bảng của Astryx bọc khung cuộn ngang: màn hẹp thì bảng giữ chiều rộng tối thiểu và cuộn ngang thay vì dồn cột.
import { Table } from '@astryxdesign/core/Table';

export default function DataTable({ minWidth = 900, ...props }) {
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        <Table {...props} />
      </div>
    </div>
  );
}
