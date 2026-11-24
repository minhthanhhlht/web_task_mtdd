// Hộp thoại xác nhận / nhập liệu của ứng dụng (thay window.confirm / prompt): useDialog().confirm / prompt.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BUTTON_DANGER, BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_CLASS } from '../constants.js';

const DialogContext = createContext(null);

// Một hộp thoại đang mở; resolve trả kết quả cho lời gọi confirm/prompt
function DialogBox({ dialog, onClose }) {
  const [value, setValue] = useState(dialog.initialValue ?? '');
  const [error, setError] = useState('');
  const cancelRef = useRef(null);
  const inputRef = useRef(null);
  const isPrompt = dialog.kind === 'prompt';

  // Focus: prompt vào ô nhập; danger vào nút Hủy
  useEffect(() => {
    if (isPrompt) inputRef.current?.focus();
    else if (dialog.danger) cancelRef.current?.focus();
  }, [isPrompt, dialog.danger]);

  // Xác nhận (prompt chạy validate, báo lỗi ngay trong hộp)
  const submit = () => {
    if (isPrompt) {
      const message = dialog.validate?.(value);
      if (message) { setError(message); return; }
      onClose(value);
    } else onClose(true);
  };
  const cancel = () => onClose(isPrompt ? null : false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => { if (!isPrompt && event.target === event.currentTarget) cancel(); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancel();
        if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') submit();
      }}
    >
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-border bg-surface-overlay p-6 shadow-modal">
        <h2 className="text-base font-semibold">{dialog.title}</h2>
        {dialog.message && <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{dialog.message}</p>}
        {isPrompt && (
          <div className="mt-3">
            {dialog.inputLabel && <label className="mb-1 block text-sm">{dialog.inputLabel}</label>}
            <input
              ref={inputRef}
              type={dialog.inputType ?? 'text'}
              value={value}
              placeholder={dialog.placeholder}
              onChange={(event) => { setValue(event.target.value); setError(''); }}
              className={`w-full ${INPUT_CLASS} ${error ? 'border-red-500' : ''}`}
            />
            {error && <p className="mt-1 text-xs text-error-text">{error}</p>}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className={BUTTON_SECONDARY} onClick={cancel}>{dialog.cancelLabel ?? 'Hủy'}</button>
          <button type="button" className={dialog.danger ? BUTTON_DANGER : BUTTON_PRIMARY} onClick={submit}>
            {dialog.confirmLabel ?? 'Đồng ý'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  // Mở hộp thoại, trả Promise kết quả
  const open = useCallback((config) => new Promise((resolve) => setDialog({ ...config, resolve })), []);
  const close = (result) => { dialog.resolve(result); setDialog(null); };

  const api = useMemo(() => ({
    confirm: (options) => open({ kind: 'confirm', title: 'Xác nhận', ...options }),
    prompt: (options) => open({ kind: 'prompt', title: 'Nhập thông tin', ...options }),
  }), [open]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && <DialogBox key={dialog.title + dialog.message} dialog={dialog} onClose={close} />}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}
