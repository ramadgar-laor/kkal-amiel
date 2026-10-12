import { getTranslations } from "@/lib/i18n/server";
import { LoginTabs } from "@/components/login-tabs";

export default async function LoginPage() {
  const { dict } = await getTranslations();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-(--color-brand-dark) text-center">
        {dict.login.title}
      </h1>
      <p className="mt-2 text-sm text-black/70 text-center">
        {dict.login.subtitle}
      </p>
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm border border-black/5">
        <LoginTabs dict={dict} />
      </div>
    </div>
  );
}
