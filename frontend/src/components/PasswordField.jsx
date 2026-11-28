// Ô nhập mật khẩu có nút ẩn/hiện (con mắt) nằm trong ô; mọi prop còn lại chuyển cho TextInput của Astryx.
import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextInput {...props} type={visible ? 'text' : 'password'} statusVariant="tooltip" />
      <div className="absolute bottom-0.5 right-0.5">
        <Button
          label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          variant="ghost"
          size="sm"
          isIconOnly
          icon={<Icon icon={visible ? EyeOff : Eye} />}
          onClick={() => setVisible((v) => !v)}
        />
      </div>
    </div>
  );
}
