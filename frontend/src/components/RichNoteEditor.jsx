// Trình soạn ghi chú rich-text (contentEditable): in đậm, nghiêng, danh sách, link, ảnh (dán/kéo thả/chọn file).
import { useEffect, useRef } from 'react';
import { imageFileToDataUrl, noteToHtml, sanitizeFragment } from '../noteHtml.js';
import { useDialog } from './DialogContext.jsx';
import { useToast } from './Toast.jsx';

// Kiểu cho nội dung bên trong (Tailwind preflight đã reset nên phải tự khai báo)
const CONTENT_STYLE = '[&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:border-collapse '
  + '[&_td]:border [&_th]:border [&_td]:border-border-strong [&_th]:border-border-strong [&_td]:p-1 [&_th]:p-1 [&_img]:max-w-full [&_blockquote]:border-l-4 '
  + '[&_blockquote]:pl-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-bold [&_pre]:bg-surface-hover [&_pre]:p-2';

// Ghi chú rỗng (không chữ, ảnh, bảng, hr) thì coi là ''
function normalize(html, root) {
  const hasContent = root.textContent.trim() !== '' || root.querySelector('img, table, hr');
  return hasContent ? html : '';
}

export default function RichNoteEditor({ value, onChange }) {
  const ref = useRef(null);
  const lastEmitted = useRef(null);
  const savedRange = useRef(null);
  const fileRef = useRef(null);
  const dialog = useDialog();
  const toast = useToast();

  // Nạp giá trị từ ngoài vào (chỉ khi khác giá trị vừa phát ra, để không nhảy con trỏ)
  useEffect(() => {
    if (value !== lastEmitted.current && ref.current) {
      ref.current.innerHTML = noteToHtml(value);
      lastEmitted.current = value;
    }
  }, [value]);

  // Báo nội dung mới ra ngoài
  const emit = () => {
    const html = normalize(ref.current.innerHTML, ref.current);
    lastEmitted.current = html;
    onChange(html);
  };

  // Chạy lệnh định dạng
  const exec = (command, arg) => {
    ref.current.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  // Chèn ảnh (đã thu nhỏ) tại vị trí con trỏ
  const insertImages = async (files) => {
    for (const file of files) {
      try {
        const url = await imageFileToDataUrl(file);
        ref.current.focus();
        document.execCommand('insertImage', false, url);
      } catch (error) {
        toast.error(error.message);
      }
    }
    emit();
  };

  // Dán: ảnh đơn thuần thì thu nhỏ rồi chèn; có HTML thì lọc; còn lại dán chữ thường
  const handlePaste = (event) => {
    const data = event.clipboardData;
    const html = data.getData('text/html');
    const text = data.getData('text/plain');
    const images = [...data.files].filter((f) => f.type.startsWith('image/'));
    event.preventDefault();
    if (images.length && !html && !text) { insertImages(images); return; }
    if (html) document.execCommand('insertHTML', false, sanitizeFragment(html));
    else document.execCommand('insertText', false, text);
    emit();
  };

  // Kéo thả ảnh vào đúng vị trí thả
  const handleDrop = (event) => {
    const images = [...event.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    event.preventDefault();
    const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    if (range) { const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
    insertImages(images);
  };

  // Chèn link: nhớ vùng chọn rồi hỏi URL bằng hộp thoại của ứng dụng
  const handleLink = async () => {
    const selection = window.getSelection();
    savedRange.current = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    const url = await dialog.prompt({
      title: 'Chèn link', inputLabel: 'Địa chỉ (http:// hoặc https://)', placeholder: 'https://...', confirmLabel: 'Chèn',
      validate: (v) => (/^(https?:\/\/|mailto:)\S+$/i.test(v.trim()) ? '' : 'Địa chỉ phải bắt đầu bằng http://, https:// hoặc mailto:'),
    });
    if (!url) return;
    ref.current.focus();
    if (savedRange.current) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange.current); }
    if (window.getSelection().isCollapsed) document.execCommand('insertHTML', false, sanitizeFragment(`<a href="${url.trim()}">${url.trim()}</a>`));
    else document.execCommand('createLink', false, url.trim());
    emit();
  };

  const toolbarButton = 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border-strong px-2 text-xs transition-colors hover:bg-button-hover';
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1">
        <button type="button" className={`${toolbarButton} font-bold`} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}>B</button>
        <button type="button" className={`${toolbarButton} italic`} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}>I</button>
        <button type="button" className={`${toolbarButton} underline`} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')}>U</button>
        <button type="button" className={toolbarButton} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}>Dấu chấm</button>
        <button type="button" className={toolbarButton} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')}>Đánh số</button>
        <button type="button" className={toolbarButton} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')}>Xóa kiểu</button>
        <button type="button" className={toolbarButton} onMouseDown={(e) => e.preventDefault()} onClick={handleLink}>Link</button>
        <button type="button" className={toolbarButton} onClick={() => fileRef.current.click()}>Ảnh</button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { insertImages([...e.target.files]); e.target.value = ''; }} />
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-labelledby="task-ghi_chu-label"
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        onDrop={handleDrop}
        className={`min-h-28 max-h-96 resize-y overflow-auto rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-focus focus:ring-2 focus:ring-focus-ring ${CONTENT_STYLE}`}
      />
    </div>
  );
}
