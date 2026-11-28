// Bảng của Astryx đặt trong khung thẻ bo góc: mỗi ô một dòng (chữ dài bị cắt bằng "…"), vừa khít chiều ngang, chỉ cuộn ngang khi màn quá hẹp so với minWidth.
// Bảng Astryx tràn ra hai bên 16px (-16px margin) nên khung cuộn bù lại bằng margin âm + padding để không sinh thanh cuộn thừa.
// onRowClick(item): bấm vào bất kỳ chỗ nào của dòng (trừ liên kết, nút, ô nhập, menu) thì gọi hàm với dữ liệu dòng đó.
// isLoading: đang tải lại thì làm mờ nhẹ bảng (giữ nguyên dữ liệu cũ) thay vì nháy trống rồi hiện lại.
import { Table } from '@astryxdesign/core/Table';

// Các phần tử tương tác riêng: bấm vào chúng không được tính là bấm dòng
const INTERACTIVE = 'a, button, input, textarea, select, label, [role="menuitem"], [role="combobox"], [role="checkbox"]';

export default function DataTable({ minWidth = 0, onRowClick, isLoading = false, ...props }) {
  const handleClick = (event) => {
    if (!onRowClick || event.target.closest(INTERACTIVE)) return;
    const row = event.target.closest('tbody tr');
    if (!row) return;
    const item = props.data?.[[...row.parentElement.children].indexOf(row)];
    if (item) onRowClick(item);
  };
  return (
    <div className={`overflow-hidden rounded-xl border border-(--color-border) bg-(--color-background-surface) transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
      <div className={`-mx-4 overflow-x-auto px-4 ${onRowClick ? '[&_tbody_tr]:cursor-pointer' : ''}`} onClick={handleClick}>
        <div style={{ minWidth }}>
          <Table textOverflow="truncate" {...props} />
        </div>
      </div>
    </div>
  );
}
