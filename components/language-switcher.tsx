'use client';

import { useLanguage } from '@/lib/i18n/use-translations';
import { LANGUAGE_NAMES } from '@/lib/i18n/utils';
import { CpuIcon } from './icons';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <Select onValueChange={setLocale} value={locale}>
      <SelectTrigger className="border-0">
        {LANGUAGE_NAMES[locale]}
      </SelectTrigger>
      <SelectContent className="min-w-[120px]">
        <SelectItem value="en">
          <span className="font-medium text-xs">{LANGUAGE_NAMES.en}</span>
        </SelectItem>
        <SelectItem value="it">
          <span className="font-medium text-xs">{LANGUAGE_NAMES.it}</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
