"use client";

import { useRouter } from "next/navigation";
import { localeCookieName, type Locale } from "@/lib/i18n/config";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function setLocale(next: Locale) {
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => setLocale("he")}
        className={locale === "he" ? "font-bold underline" : "opacity-70"}
      >
        עברית
      </button>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={locale === "en" ? "font-bold underline" : "opacity-70"}
      >
        English
      </button>
    </div>
  );
}
