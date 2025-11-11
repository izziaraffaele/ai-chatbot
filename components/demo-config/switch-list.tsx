import { cn, generateUUID } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useRef } from 'react';

export function SwitchListControl(
  props: React.ComponentProps<'div'> & {
    value?: Record<string, boolean>;
    defaultValue?: Record<string, boolean>;
    options?: { label: React.ReactNode; value: string; disabled?: boolean }[];
    onValueChange?: (value: Record<string, boolean>) => void;
  }
) {
  const {
    defaultValue,
    value = defaultValue || {},
    options = [],
    className,
    onValueChange = () => {},
    ...others
  } = props;

  const switchIdRef = useRef(generateUUID());
  console.log(options);
  return (
    <div {...others} className={cn('space-y-2', className)}>
      {options.map((item, i) => (
        <div key={i} className="flex items-center space-x-2">
          <Switch
            id={`${switchIdRef}-${item.value}`}
            checked={value[item.value]}
            disabled={item.disabled}
            defaultChecked={defaultValue && defaultValue[item.value]}
            onCheckedChange={(v) => {
              onValueChange({ ...value, [item.value]: v });
            }}
          />
          <Label htmlFor={`${switchIdRef}-${item.value}`}>{item.label}</Label>
        </div>
      ))}
    </div>
  );
}
