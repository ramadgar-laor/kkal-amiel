import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";

export default async function RepDashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: rep } = await supabase
    .from("reps")
    .select("status, first_name_he, last_name_he, country")
    .eq("profile_id", userData.user!.id)
    .single();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, start_date, requested_amount, requested_currency, status")
    .eq("rep_id", userData.user!.id)
    .order("created_at", { ascending: false });

  const isApproved = rep?.status === "approved";

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white border border-black/5 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-(--color-brand-dark)">
          ברוך/ה הבא/ה{rep ? `, ${rep.first_name_he}` : ""}
        </h1>
        <p className="mt-2 text-sm flex items-center gap-2">
          סטטוס הרשמה: <StatusBadge status={rep?.status ?? "pending"} />
        </p>
        {!isApproved && (
          <p className="mt-2 text-sm text-black/60">
            לאחר אישור ההרשמה על ידי קק״ל תיפתח עבורך האפשרות ליצור אירועים
            ולהגיש בקשות תקציב.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white border border-black/5 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-(--color-brand-dark)">
            האירועים שלי
          </h2>
          {isApproved && (
            <Link
              href="/rep/events/new"
              className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition"
            >
              + אירוע חדש
            </Link>
          )}
        </div>

        {!events?.length ? (
          <p className="mt-4 text-sm text-black/50">עדיין לא נוצרו אירועים.</p>
        ) : (
          <div className="mt-4 divide-y divide-black/5">
            {events.map((e) => (
              <Link
                key={e.id}
                href={`/rep/events/${e.id}`}
                className="flex items-center justify-between py-3 hover:bg-black/[0.02] -mx-2 px-2 rounded"
              >
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-black/50">
                    {e.start_date} · {e.requested_amount} {e.requested_currency}
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
