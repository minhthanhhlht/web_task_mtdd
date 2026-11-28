// Hộp thoại xác nhận / nhập liệu của ứng dụng (thay window.confirm / prompt): useDialog().confirm / prompt.
// Xác nhận dùng AlertDialog của Astryx; nhập liệu dùng Dialog + TextInput, không đóng khi bấm nền.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import PasswordField from './PasswordField.jsx';

const DialogContext = createContext(null);

// Hộp nhập liệu: kiểm tra bằng validate, báo lỗi ngay trong hộp và chỉ đóng khi hợp lệ
function PromptDialog({ dialog, onClose }) {
  const [value, setValue] = useState(dialog.initialValue ?? '');
  const [error, setError] = useState('');
  const submit = () => {
    const message = dialog.validate?.(value);
    if (message) { setError(message); return; }
    onClose(value);
  };
  const Input = dialog.inputType === 'password' ? PasswordField : TextInput;
  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open) onClose(null); }} purpose="form">
      <Layout
        header={<LayoutHeader><DialogHeader title={dialog.title} onOpenChange={(open) => { if (!open) onClose(null); }} /></LayoutHeader>}
        content={(
          <LayoutContent>
            {dialog.message && <Text display="block">{dialog.message}</Text>}
            <Input
              label={dialog.inputLabel ?? 'Giá trị'}
              value={value}
              placeholder={dialog.placeholder}
              hasAutoFocus
              onChange={(next) => { setValue(next); setError(''); }}
              onEnter={submit}
              status={error ? { type: 'error', message: error } : undefined}
            />
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter>
            <div className="flex justify-end gap-2">
              <Button label={dialog.cancelLabel ?? 'Hủy'} onClick={() => onClose(null)} />
              <Button label={dialog.confirmLabel ?? 'Đồng ý'} variant="primary" onClick={submit} />
            </div>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  // Mở hộp thoại, trả Promise kết quả
  const open = useCallback((config) => new Promise((resolve) => setDialog({ ...config, resolve })), []);
  const close = (result) => { dialog?.resolve(result); setDialog(null); };

  const api = useMemo(() => ({
    confirm: (options) => open({ kind: 'confirm', title: 'Xác nhận', ...options }),
    prompt: (options) => open({ kind: 'prompt', title: 'Nhập thông tin', ...options }),
  }), [open]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog?.kind === 'confirm' && (
        <AlertDialog
          isOpen
          onOpenChange={(isOpen) => { if (!isOpen) close(false); }}
          title={dialog.title}
          description={dialog.message ?? ''}
          actionLabel={dialog.confirmLabel ?? 'Đồng ý'}
          cancelLabel={dialog.cancelLabel ?? 'Hủy'}
          actionVariant={dialog.danger ? 'destructive' : 'primary'}
          onAction={() => close(true)}
        />
      )}
      {dialog?.kind === 'prompt' && <PromptDialog key={dialog.title} dialog={dialog} onClose={close} />}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}
