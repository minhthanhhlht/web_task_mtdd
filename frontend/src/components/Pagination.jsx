// Thanh phân trang: tổng số, chọn số dòng/trang và dãy trang, dựng trên Pagination của Astryx.
import { Pagination as AstryxPagination } from '@astryxdesign/core/Pagination';
import { Text } from '@astryxdesign/core/Text';
import { PAGE_SIZE_OPTIONS } from '../constants.js';

export default function Pagination({ total, page, limit, unit = 'task', onChangePage, onChangeLimit }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <Text color="secondary"><span className="tabular-nums">{total} {unit} · trang {page}/{totalPages}</span></Text>
      <AstryxPagination
        page={page}
        onChange={onChangePage}
        totalItems={total}
        totalPages={totalPages}
        pageSize={limit}
        pageSizeOptions={onChangeLimit ? PAGE_SIZE_OPTIONS : undefined}
        onPageSizeChange={onChangeLimit}
        variant="pages"
        label="Phân trang"
      />
    </div>
  );
}
