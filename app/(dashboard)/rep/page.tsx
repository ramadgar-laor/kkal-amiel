import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { formatDateDMY } from "@/lib/utils/date";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

function t(template: string, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export default async function RepDashboardPage() {
  const supabase = await createClient();
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const d = dict.repDashboard;

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
          {rep
            ? t(d.welcome, { name: rep.first_name_he ?? "" })
            : d.welcomeNoName}
        </h1>
        <p className="mt-2 text-sm flex items-center gap-2">
          {d.statusLabel} <StatusBadge status={rep?.status ?? "pending"} locale={locale} />
        </p>
        {!isApproved && (
          <p className="mt-2 text-sm text-black/60">{d.notApprovedNote}</p>
        )}
      </div>

      <div className="rounded-xl bg-white border border-black/5 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-(--color-brand-dark)">
            {d.myEventsTitle}
          </h2>
          {isApproved && (
            <Link
              href="/rep/events/new"
              className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition"
            >
              {d.newEventButton}
            </Link>
          )}
        </div>

        {!events?.length ? (
          <p className="mt-4 text-sm text-black/50">{d.noEventsYet}</p>
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
                    {formatDateDMY(e.start_date)} · {e.requested_amount}{" "}
                    {e.requested_currency}
                  </div>
                </div>
                <StatusBadge status={e.status} locale={locale} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
