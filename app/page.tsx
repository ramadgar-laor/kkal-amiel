import Link from "next/link";
import { getTranslations } from "@/lib/i18n/server";

// Authenticated users and unauthenticated visitors are both redirected away
// from "/" by the proxy (to their role's dashboard, or to /login). This
// page is only a safety-net fallback in case that redirect hasn't run yet.
export default async function Home() {
  const { dict } = await getTranslations();

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-(--color-brand-dark)">
        {dict.appName}
      </h1>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/login"
          className="rounded-md bg-(--color-brand) text-white font-medium py-2.5"
        >
          {dict.nav.login}
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-(--color-brand) text-(--color-brand) font-medium py-2.5"
        >
          {dict.nav.register}
        </Link>
      </div>
    </div>
  );
}
