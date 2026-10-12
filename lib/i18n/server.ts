import { cookies } from "next/headers";
import { defaultLocale, locales, localeCookieName, type Locale } from "./config";
import { getDictionary } from "./dictionaries";

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(localeCookieName)?.value;
  return (locales as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : defaultLocale;
}

export async function getTranslations() {
  const locale = await getCurrentLocale();
  return { locale, dict: getDictionary(locale) };
}
