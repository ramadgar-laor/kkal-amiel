import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { dict } = await getTranslations();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-(--color-brand-dark) text-center">
        {dict.login.updatePasswordTitle}
      </h1>
      <p className="mt-2 text-sm text-black/70 text-center">
        {dict.login.updatePasswordSubtitle}
      </p>
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm border border-black/5">
        <UpdatePasswordForm dict={dict} />
      </div>
    </div>
  );
}
