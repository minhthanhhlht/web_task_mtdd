// Form thông tin task dùng cho cả thêm mới và sửa (có kiểm tra phía client).
import MenuIcon from './MenuIcon.jsx';
import { Children, cloneElement, useState } from 'react';
import {
  BUTTON_PRIMARY, fromInputDateTime, INPUT_CLASS, isHttpUrl, LINK_MESSAGE, PWIRE_NUMBER_MESSAGE, PWIRE_NUMBER_PATTERN,
  sanitizePwireNumber, TASK_CODE_PREFIX, toInputDateTime,
} from '../constants.js';
import useDataItems from '../useDataItems.js';
import DateTimeInput from './DateTimeInput.jsx';
import FieldError from './FieldError.jsx';
import RichNoteEditor from './RichNoteEditor.jsx';
import { useStatuses } from './StatusContext.jsx';

// Một ô có nhãn, bọc lỗi bên dưới
function Field({ label, name, error, children }) {
  // Gắn id/name vào ô nhập đầu tiên để nhãn bấm được và trình duyệt gợi ý đúng
  const [control, ...rest] = Children.toArray(children);
  const id = `task-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {cloneElement(control, { id, name })}
      {rest}
      <FieldError message={error} />
    </div>
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
    tien_do: String(initialValues.tien_do ?? 0),
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
      const progress = Number(values.tien_do);
      if (values.tien_do === '' || !Number.isInteger(progress) || progress < 0 || progress > 100) found.tien_do = 'Tiến độ phải là số nguyên từ 0 đến 100';
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
  const inputClass = (field) => `w-full ${INPUT_CLASS} ${errors[field] ? 'border-red-500' : ''}`;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className={`grid gap-3 ${gridClass}`}>
        <Field label="Số Pwire *" name="ma_task" error={errors.ma_task}>
          <input className={inputClass('ma_task')} value={values.ma_task} onChange={(e) => set('ma_task', sanitizePwireNumber(e.target.value, initialValues.ma_task))} />
        </Field>
        <Field label="Tên task *" name="ten" error={errors.ten}>
          <input className={inputClass('ten')} value={values.ten} onChange={(e) => set('ten', e.target.value)} />
        </Field>
        <Field label="Ngày giờ nhận *" name="ngay_nhan" error={errors.ngay_nhan}>
          <DateTimeInput value={values.ngay_nhan} onChange={(v) => set('ngay_nhan', v)} hasError={Boolean(errors.ngay_nhan)} />
        </Field>
        <Field label="Deadline" name="deadline" error={errors.deadline}>
          <DateTimeInput value={values.deadline} onChange={(v) => set('deadline', v)} clearable />
        </Field>
        <Field label="Thực tế dev hoàn thành" name="dev_hoan_thanh_thuc_te" error={errors.dev_hoan_thanh_thuc_te}>
          <DateTimeInput value={values.dev_hoan_thanh_thuc_te} onChange={(v) => set('dev_hoan_thanh_thuc_te', v)} clearable />
        </Field>
        <Field label="Người giao *" name="nguoi_giao" error={errors.nguoi_giao}>
          <input className={inputClass('nguoi_giao')} value={values.nguoi_giao} onChange={(e) => set('nguoi_giao', e.target.value)} />
        </Field>
        <Field label="Dev Cross check" name="dev_cross_check" error={errors.dev_cross_check}>
          <select className={inputClass('dev_cross_check')} value={values.dev_cross_check} onChange={(e) => set('dev_cross_check', e.target.value)}>
            <option value="">— Chưa chọn —</option>
            {devOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </Field>
        <Field label="Link Pwire" name="link_test_case" error={errors.link_test_case}>
          <input className={inputClass('link_test_case')} placeholder="https://..." value={values.link_test_case} onChange={(e) => set('link_test_case', e.target.value)} />
          {isHttpUrl(values.link_test_case) && (
            <a href={values.link_test_case.trim()} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex h-8 items-center gap-1 text-xs text-primary underline-offset-4 hover:text-primary-hover hover:underline"><MenuIcon name="external" className="size-3.5" /> Mở link Pwire</a>
          )}
        </Field>
        {showProgress && (
          <>
            <Field label="Tiến độ (%)" name="tien_do" error={errors.tien_do}>
              <input type="number" min="0" max="100" className={inputClass('tien_do')} value={values.tien_do} onChange={(e) => set('tien_do', e.target.value)} />
            </Field>
            <Field label="Trạng thái" name="trang_thai" error={errors.trang_thai}>
              <select className={inputClass('trang_thai')} value={values.trang_thai} onChange={(e) => set('trang_thai', e.target.value)}>
                {statuses.map((status) => <option key={status.id} value={status.ten}>{status.ten}</option>)}
              </select>
            </Field>
          </>
        )}
      </div>
      <div>
        <p id="task-ghi_chu-label" className="mb-1 block text-sm font-medium">Ghi chú</p>
        <RichNoteEditor value={values.ghi_chu} onChange={(html) => set('ghi_chu', html)} />
      </div>
      {formError && <p className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">{formError}</p>}
      <button type="submit" className={BUTTON_PRIMARY} disabled={saving}>{saving ? 'Đang lưu...' : submitLabel}</button>
    </form>
  );
}
