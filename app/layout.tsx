import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentLocale } from "@/lib/i18n/server";
import { dirForLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { KklLogo } from "@/components/kkl-logo";

// Font: a plain system-font stack defined in globals.css (see --font-sans)
// rather than next/font/google. This keeps builds from depending on
// reaching fonts.googleapis.com, and still renders Hebrew well via the
// OS/browser's native Hebrew-capable system fonts. Swap in a self-hosted
// brand font later if KKL's brand guide specifies one.

export const metadata: Metadata = {
  title: 'פרוייקט קק"ל בקהילה של שגרירי קק"ל',
  description: 'מערכת לניהול שליחים, אירועים, תקציבים וחשבוניות עבור קק"ל',
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const dir = dirForLocale(locale);

  return (
    <html lang={locale} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
            <Link href="/" aria-label={dict.appName} className="shrink-0">
              <KklLogo className="h-12 w-auto py-1" />
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-(--color-brand-dark) hidden sm:inline">
                {dict.appName}
              </span>
              <LocaleSwitcher locale={locale} />
            </div>
          </div>
        </header>
        <main className="flex-1 bg-(--color-brand-light)/40">{children}</main>
        <footer className="border-t border-black/10 py-4 text-center text-xs text-black/50">
          © {new Date().getFullYear()} קרן קיימת לישראל
        </footer>
      </body>
    </html>
  );
}
