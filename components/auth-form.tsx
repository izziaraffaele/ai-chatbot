"use client";

import Form from "next/form";
import { useTranslations } from "@/lib/i18n/use-translations";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
  type = "login",
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  type?: "login" | "register";
}) {
  const t = useTranslations();
  const emailLabelKey =
    type === "register" ? "auth.register.emailLabel" : "auth.login.emailLabel";
  const emailPlaceholderKey =
    type === "register"
      ? "auth.register.emailPlaceholder"
      : "auth.login.emailPlaceholder";
  const passwordLabelKey =
    type === "register"
      ? "auth.register.passwordLabel"
      : "auth.login.passwordLabel";
  return (
    <Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
      <div className="flex flex-col gap-2">
        <Label
          className="font-normal text-zinc-600 dark:text-zinc-400"
          htmlFor="email"
        >
          {t(emailLabelKey, "Email Address")}
        </Label>

        <Input
          autoComplete="email"
          autoFocus
          className="bg-muted text-md md:text-sm"
          defaultValue={defaultEmail}
          id="email"
          name="email"
          placeholder={t(emailPlaceholderKey, "user@example.com")}
          required
          type="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          className="font-normal text-zinc-600 dark:text-zinc-400"
          htmlFor="password"
        >
          {t(passwordLabelKey, "Password")}
        </Label>

        <Input
          className="bg-muted text-md md:text-sm"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {children}
    </Form>
  );
}
