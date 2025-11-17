import { useCallback, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

export function useDebouncedSave<T>(
  options: {
    delay?: number;
    onSave?: (value: T, next: () => void) => void;
  } = {}
) {
  const {
    delay = 2000,
    onSave = () => {
      return;
    },
  } = options;

  const [isDirty, setIsDirty] = useState(false);

  const debouncedSave = useDebounceCallback(onSave, delay);

  const save = useCallback(
    (value: T, debounce = true) => {
      setIsDirty(true);
      const next = () => {
        setIsDirty(false);
      };

      if (debounce) {
        debouncedSave(value, next);
      } else {
        onSave(value, next);
      }
    },
    [debouncedSave, onSave]
  );

  return {
    isDirty,
    save,
  };
}
