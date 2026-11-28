// Form thông tin task dùng cho cả thêm mới và sửa (có kiểm tra phía client), dựng bằng các ô nhập của Astryx.
import { useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { DateTimeInput } from '@astryxdesign/core/DateTimeInput';
import { Link } from '@astryxdesign/core/Link';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import {
  fromInputDateTime, isHttpUrl, LINK_MESSAGE, PWIRE_NUMBER_MESSAGE, PWIRE_NUMBER_PATTERN,
  sanitizePwireNumber, TASK_CODE_PREFIX, toInputDateTime,
} from '../constants.js';
import useDataItems from '../useDataItems.js';
import RichNoteEditor from './RichNoteEditor.jsx';
import { useStatuses } from './StatusContext.jsx';

// Ô ngày giờ 24 giờ, tuần bắt đầu thứ Hai, lịch dạng popover
function DateTimeField({ label, value, onChange, error, isRequired, hasClear }) {
  return (
    <DateTimeInput
      label={label}
      value={value || undefined}
      onChange={(next) => onChange(next ? String(next).slice(0, 16) : '')}
      hourFormat="24h"
      weekStartsOn="mon"
      presentation="popover"
      isRequired={isRequired}
      hasClear={hasClear}
      status={error ? { type: 'error', message: error } : undefined}
    />
  );
}

export default function TaskForm({ initialValues, showProgress = false, submitLabel = 'Lưu', onSubmit, gridClass = 'grid-cols-1 sm:grid-cols-2' }) {
  const { statuses, getStatus } = useStatuses();
  const { items: devItems } = useDataItems('dev');
  const [values, setValues] = useState(() => ({
    ma_task: initialValues.ma_task ?? '',
    ten: initialValues.ten ?? '',
    ngay_nhan: toInputDateTime(initialValues.ngay_nhan),
    deadline: toInputDateTime(initialValues.deadline),
    dev_hoan_thanh_thuc_te: toInputDateTime(initialValues.dev_hoan_thanh_thuc_te),
    nguoi_giao: initialValues.nguoi_giao ?? '',
    dev_cross_check: initialValues.dev_cross_check ?? '',
    link_test_case: initialValues.link_test_case ?? '',
    tien_do: initialValues.tien_do ?? 0,
    trang_thai: initialValues.trang_thai ?? '',
    ghi_chu: initialValues.ghi_chu ?? '',
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Đổi một ô và xóa lỗi của ô đó
  const set = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const statusOf = (field) => (errors[field] ? { type: 'error', message: errors[field] } : undefined);

  // Kiểm tra phía client; trả object lỗi theo ô
  const validate = () => {
    const found = {};
    const code = values.ma_task.trim();
    if (!code || code === TASK_CODE_PREFIX) found.ma_task = 'Vui lòng nhập Số Pwire';
    else if (code !== initialValues.ma_task && !PWIRE_NUMBER_PATTERN.test(code)) found.ma_task = PWIRE_NUMBER_MESSAGE;
    if (!values.ten.trim()) found.ten = 'Vui lòng nhập tên task';
    if (!values.nguoi_giao.trim()) found.nguoi_giao = 'Vui lòng nhập người giao';
    if (!values.ngay_nhan) found.ngay_nhan = 'Vui lòng chọn ngày giờ nhận';
    const link = values.link_test_case.trim();
    if (link && link !== initialValues.link_test_case && !isHttpUrl(link)) found.link_test_case = LINK_MESSAGE;
    if (showProgress) {
      const progress = values.tien_do;
      if (progress === null || progress === undefined || !Number.isInteger(progress) || progress < 0 || progress > 100) found.tien_do = 'Tiến độ phải là số nguyên từ 0 đến 100';
      else if (getStatus(values.trang_thai)?.yeu_cau_hoan_tat && progress !== 100) found.tien_do = `Chuyển sang ${values.trang_thai} thì tiến độ phải là 100%`;
    }
    return found;
  };

  // Gửi form; lỗi server nhận diện được thì gắn vào đúng ô
  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;
    const payload = {
      ma_task: values.ma_task.trim(),
      ten: values.ten.trim(),
      ngay_nhan: fromInputDateTime(values.ngay_nhan),
      deadline: values.deadline ? fromInputDateTime(values.deadline) : null,
      dev_hoan_thanh_thuc_te: values.dev_hoan_thanh_thuc_te ? fromInputDateTime(values.dev_hoan_thanh_thuc_te) : null,
      nguoi_giao: values.nguoi_giao.trim(),
      ghi_chu: values.ghi_chu,
      link_test_case: values.link_test_case.trim(),
      dev_cross_check: values.dev_cross_check,
    };
    if (showProgress) { payload.tien_do = Number(values.tien_do); payload.trang_thai = values.trang_thai; }
    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      const message = error.message;
      if (message.startsWith('Số Pwire đã tồn tại') || message.startsWith('Số Pwire phải bắt đầu')) setErrors({ ma_task: message });
      else if (message.startsWith('Link Pwire phải là')) setErrors({ link_test_case: message });
      else setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const devOptions = devItems.map((item) => item.ten);
  if (values.dev_cross_check && !devOptions.includes(values.dev_cross_check)) devOptions.push(values.dev_cross_check);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className={`grid gap-3 ${gridClass}`}>
        <TextInput label="Số Pwire" isRequired htmlName="ma_task" value={values.ma_task} onChange={(v) => set('ma_task', sanitizePwireNumber(v, initialValues.ma_task))} status={statusOf('ma_task')} />
        <TextInput label="Tên task" isRequired htmlName="ten" value={values.ten} onChange={(v) => set('ten', v)} status={statusOf('ten')} />
        <DateTimeField label="Ngày giờ nhận" isRequired value={values.ngay_nhan} onChange={(v) => set('ngay_nhan', v)} error={errors.ngay_nhan} />
        <DateTimeField label="Deadline" hasClear value={values.deadline} onChange={(v) => set('deadline', v)} error={errors.deadline} />
        <DateTimeField label="Thực tế dev hoàn thành" hasClear value={values.dev_hoan_thanh_thuc_te} onChange={(v) => set('dev_hoan_thanh_thuc_te', v)} error={errors.dev_hoan_thanh_thuc_te} />
        <TextInput label="Người giao" isRequired htmlName="nguoi_giao" value={values.nguoi_giao} onChange={(v) => set('nguoi_giao', v)} status={statusOf('nguoi_giao')} />
        <Selector
          label="Dev Cross check" value={values.dev_cross_check} hasSearch
          options={[{ value: '', label: '— Chưa chọn —' }, ...devOptions.map((name) => ({ value: name, label: name }))]}
          onChange={(v) => set('dev_cross_check', v ?? '')}
          status={statusOf('dev_cross_check')}
        />
        <div>
          <TextInput label="Link Pwire" htmlName="link_test_case" placeholder="https://..." value={values.link_test_case} onChange={(v) => set('link_test_case', v)} status={statusOf('link_test_case')} />
          {isHttpUrl(values.link_test_case) && <div className="mt-1"><Link href={values.link_test_case.trim()} isExternalLink>Mở link Pwire</Link></div>}
        </div>
        {showProgress && (
          <>
            <NumberInput label="Tiến độ (%)" min={0} max={100} isIntegerOnly value={values.tien_do} onChange={(v) => set('tien_do', v)} status={statusOf('tien_do')} />
            <Selector
              label="Trạng thái" value={values.trang_thai}
              options={statuses.map((status) => ({ value: status.ten, label: status.ten }))}
              onChange={(v) => set('trang_thai', v ?? '')}
              status={statusOf('trang_thai')}
            />
          </>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Text weight="medium">Ghi chú</Text>
        <RichNoteEditor id="task-ghi_chu" value={values.ghi_chu} onChange={(html) => set('ghi_chu', html)} />
      </div>
      {formError && <Banner status="error" title={formError} />}
      <div><Button type="submit" variant="primary" label={saving ? 'Đang lưu...' : submitLabel} isDisabled={saving} /></div>
    </form>
  );
}
