import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";
import { SignOutButton } from "@/components/sign-out-button";

const ROLE_LABEL: Record<string, { he: string; en: string }> = {
  rep: { he: "שליח", en: "Ambassador" },
  kkal: { he: 'קק"ל', en: "KKL" },
  amiel: { he: "עמיאל", en: "Amiel" },
  admin: { he: "מנהל מערכת", en: "Admin" },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, email")
    .eq("id", user.id)
    .single();

  const { locale } = await getTranslations();
  const role = profile?.role ?? "rep";
  const roleLabel = ROLE_LABEL[role]?.[locale] ?? role;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-6 rounded-lg bg-white border border-black/5 px-4 py-3 shadow-sm">
        <div className="text-sm">
          <span className="font-semibold text-(--color-brand-dark)">
            {profile?.display_name ?? profile?.email}
          </span>
          <span className="mx-2 text-black/30">·</span>
          <span className="inline-block rounded-full bg-(--color-accent-light) text-(--color-accent-dark) px-2.5 py-0.5 text-xs font-medium">
            {roleLabel}
          </span>
        </div>
        <SignOutButton />
      </div>
      {children}
    </div>
  );
}
