import Link from "next/link";
import { getSystemSettings } from "@/lib/content/settings-read";
import { SETTINGS_DEFS } from "@/lib/content/settings-defs";
import { AdminSettingsForm } from "@/components/admin-settings-form";

export default async function AdminSettingsPage() {
  const values = await getSystemSettings(SETTINGS_DEFS.map((d) => d.key));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-(--color-brand) underline">
          ← חזרה לניהול משתמשים
        </Link>
        <h1 className="mt-3 text-xl font-bold text-(--color-brand-dark)">
          הגדרות מערכת
        </h1>
        <p className="text-sm text-black/60 mt-1">
          טקסטים שמוצגים למשתמשים במערכת, ניתנים לעריכה כאן בלי לשנות קוד.
          השינוי נכנס לתוקף באופן מיידי.
        </p>
      </div>

      <AdminSettingsForm defs={SETTINGS_DEFS} values={values} />
    </div>
  );
}
