"use client";

import { Languages, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Action, Actions } from "@/components/elements/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/lib/i18n/types";
import { useLanguage, useTranslations } from "@/lib/i18n/use-translations";
import { LANGUAGE_NAMES } from "@/lib/i18n/utils";

export function SidebarChatActions() {
  const { setTheme, resolvedTheme } = useTheme();
  const { locale, setLocale } = useLanguage();
  const t = useTranslations();

  const handleThemeToggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const languageButton = (
    <Action tooltip={LANGUAGE_NAMES[locale]}>
      <Languages className="size-4" />
    </Action>
  );

  const themeToggleKey =
    resolvedTheme === "light"
      ? "sidebar.actions.toggleDark"
      : "sidebar.actions.toggleLight";

  return (
    <Actions className="w-full justify-center">
      <Action
        label={t(
          themeToggleKey,
          `Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`
        )}
        onClick={handleThemeToggle}
        tooltip={t(
          themeToggleKey,
          `Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`
        )}
      >
        {resolvedTheme === "light" ? (
          <Moon className="size-4" />
        ) : (
          <Sun className="size-4" />
        )}
      </Action>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>{languageButton}</DropdownMenuTrigger>
        <DropdownMenuContent className="space-y-1" side="top">
          {Object.keys(LANGUAGE_NAMES).map((item) => (
            <DropdownMenuItem
              className={item === locale ? "bg-accent" : ""}
              key={item}
              onSelect={() => setLocale(item as Locale)}
            >
              {LANGUAGE_NAMES[item as Locale]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Actions>
  );
}
