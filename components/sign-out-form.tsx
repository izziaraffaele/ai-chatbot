"use client";

import Form from "next/form";

import { signOut } from "@/app/(auth)/auth";
import { useTranslations } from "@/lib/i18n/use-translations";

export const SignOutForm = () => {
  const t = useTranslations();

  return (
    <Form
      action={async () => {
        "use server";

        await signOut({
          redirectTo: "/",
        });
      }}
      className="w-full"
    >
      <button
        className="w-full px-1 py-0.5 text-left text-red-500"
        type="submit"
      >
        {t("sidebar.user.signOut", "Sign out")}
      </button>
    </Form>
  );
};
