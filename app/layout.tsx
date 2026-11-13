import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentLocale } from "@/lib/i18n/server";
import { dirForLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { KklLogo } from "@/components/kkl-logo";
import { KkalNav } from "@/components/kkal-nav";
import { AmielNav } from "@/components/amiel-nav";
import { AdminNav } from "@/components/admin-nav";
import { RepNav } from "@/components/rep-nav";
import { ProfileMenu } from "@/components/profile-menu";
import { createClient } from "@/lib/supabase/server";

// Font: a plain system-font stack defined in globals.css (see --font-sans)
// rather than next/font/google. This keeps builds from depending on
// reaching fonts.googleapis.com, and still renders Hebrew well via the
// OS/browser's native Hebrew-capable system fonts. Swap in a self-hosted
// brand font later if KKL's brand guide specifies one.

export const metadata: Metadata = {
  title: 'פרוייקט קק"ל בקהילה של שגרירי קק"ל',
  description: 'מערכת לניהול שליחים, אירועים, תקציבים וחשבוניות עבור קק"ל',
};

// Self-hosted guide (screenshots + step-by-step instructions) for the rep
// role, served as a static page from /public so it lives on our own domain
// instead of claude.ai (and so it's reachable by reps without a Claude
// account). It's a standalone page with no navigation to the other roles'
// guides, so sharing it never exposes KKL/Amiel/admin workflow info -- see
// the matching pages added for those roles once their guides exist.
const REP_GUIDE_URL = "/guides/rep/index.html";

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const dir = dirForLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  let profile: { role: string; display_name: string | null; email: string | null } | null =
    null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, display_name, email")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const roleLabel = profile
    ? dict.roles[profile.role as keyof typeof dict.roles] ?? profile.role
    : null;

  return (
    <html lang={locale} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto max-w-5xl flex items-center gap-4 px-4 py-3">
            <Link href="/" aria-label={dict.appName} className="shrink-0">
              <KklLogo className="h-12 w-auto py-1" />
            </Link>

            {profile?.role === "kkal" && <KkalNav labels={dict.nav} />}
            {profile?.role === "amiel" && <AmielNav labels={dict.nav} />}
            {profile?.role === "admin" && <AdminNav labels={dict.nav} />}
            {profile?.role === "rep" && <RepNav labels={dict.nav} />}
            {profile?.role === "rep" && (
              <Link
                href={REP_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-black/60 hover:bg-black/5 hover:text-(--color-brand-dark) transition"
              >
                {dict.nav.repGuide} ↗
              </Link>
            )}

            <div className="flex items-center gap-4 ms-auto">
              {!user && (
                <span className="text-sm font-medium text-(--color-brand-dark) hidden sm:inline">
                  {dict.appName}
                </span>
              )}
              <LocaleSwitcher locale={locale} />
              {user && profile && (
                <ProfileMenu
                  displayName={profile.display_name || profile.email || ""}
                  roleLabel={roleLabel ?? profile.role}
                  logoutLabel={dict.nav.logout}
                />
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 bg-(--color-brand-light)/40">{children}</main>
        <footer className="border-t border-black/10 py-4 text-center text-xs text-black/50">
          © {new Date().getFullYear()} קרן קיימת לישראל ועמיאל טורס
        </footer>
      </body>
    </html>
  );
}
