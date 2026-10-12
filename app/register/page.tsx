import { getTranslations } from "@/lib/i18n/server";
import { getSystemSetting } from "@/lib/content/settings-read";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const { dict, locale } = await getTranslations();
  const introMarkdown = await getSystemSetting(
    locale === "en" ? "register_intro_en" : "register_intro_he"
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-(--color-brand-dark)">
        {dict.register.title}
      </h1>
      <p className="mt-2 text-sm text-black/70">{dict.register.subtitle}</p>
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm border border-black/5">
        <RegisterForm dict={dict} locale={locale} introMarkdown={introMarkdown} />
      </div>
    </div>
  );
}
