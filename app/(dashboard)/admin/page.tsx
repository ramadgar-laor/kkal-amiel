import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminRoleSelect } from "@/components/admin-role-select";
import { AdminCreateUserForm } from "@/components/admin-create-user-form";

const ROLE_LABEL: Record<string, string> = {
  rep: "שליח",
  kkal: 'קק"ל',
  amiel: "עמיאל",
  admin: "מנהל מערכת",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, email, display_name, created_at")
    .order("created_at", { ascending: false });

  const counts = (profiles ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          לוח בקרה — מנהל מערכת
        </h1>
        <p className="text-sm text-black/60 mt-1">
          ניהול משתמשים והרשאות גישה למערכת. יש גם גישה מלאה לכל מסכי קק&quot;ל
          ועמיאל (ראו תפריט הניווט למעלה), ולהגדרות מערכת שניתן לערוך בלי
          לשנות קוד.
        </p>
      </div>

      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1 rounded-md border border-(--color-brand) text-(--color-brand) text-sm font-medium px-4 py-2 hover:bg-(--color-brand-light) transition"
      >
        הגדרות מערכת ←
      </Link>

      <div className="flex flex-wrap gap-3">
        {Object.entries(ROLE_LABEL).map(([role, label]) => (
          <div
            key={role}
            className="rounded-lg bg-white border border-black/5 px-4 py-2.5 shadow-sm text-sm"
          >
            <span className="font-semibold text-(--color-brand-dark)">
              {counts[role] ?? 0}
            </span>
            <span className="text-black/50 mx-1.5">·</span>
            <span className="text-black/70">{label}</span>
          </div>
        ))}
      </div>

      <AdminCreateUserForm />

      <div>
        <h2 className="font-semibold text-(--color-brand-dark) mb-3">
          כל המשתמשים ({profiles?.length ?? 0})
        </h2>

        {!profiles || profiles.length === 0 ? (
          <p className="text-sm text-black/50">אין משתמשים במערכת.</p>
        ) : (
          <div className="rounded-xl bg-white border border-black/5 divide-y divide-black/5">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {p.display_name || p.email}
                    {p.id === currentUserId && (
                      <span className="text-black/40 font-normal"> (זה אני)</span>
                    )}
                  </div>
                  <div className="text-xs text-black/50 truncate">
                    {p.email}
                  </div>
                </div>
                <AdminRoleSelect
                  profileId={p.id}
                  role={p.role}
                  disabled={p.id === currentUserId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
