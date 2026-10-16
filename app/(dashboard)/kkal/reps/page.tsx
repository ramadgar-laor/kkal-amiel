import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RepReviewButtons } from "@/components/rep-review-buttons";
import { RepsDirectoryTable, type RepDirectoryRow } from "@/components/reps-directory-table";
import { getCountryName } from "@/lib/data/countries";
import { formatDateDMY } from "@/lib/utils/date";

const PARTICIPATION_LABEL_HE: Record<string, string> = {
  trustee: 'נאמן קק"ל',
  fellow: 'עמית קק"ל',
  coordinator: 'רכז קק"ל',
};

export default async function KkalRepsPage() {
  const supabase = await createClient();

  // Two separate queries instead of an embedded `profiles:profile_id(...)`
  // select: `reps` has two foreign keys into `profiles` (profile_id and
  // reviewed_by), and relying on PostgREST to disambiguate the embed by
  // column name silently returned an empty result set in production
  // (dashboard counts were correct, this list was not) even though the
  // underlying data and RLS policies were fine. Fetching profiles
  // separately and joining in JS sidesteps that ambiguity entirely.
  const { data: reps } = await supabase
    .from("reps")
    .select(
      "profile_id, first_name_he, last_name_he, first_name_local, last_name_local, whatsapp_phone, mission_phone, country, organization, activity_level, mission_location_name, institution_type, institution_city, main_role, mission_start_date, mission_end_date_expected, status, created_at"
    )
    .order("created_at", { ascending: false });

  const profileIds = (reps ?? []).map((r) => r.profile_id);
  const { data: profiles } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", profileIds)
      : { data: [] as { id: string; email: string | null; display_name: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const pending = reps?.filter((r) => r.status === "pending") ?? [];
  const all = reps ?? [];

  function displayNameFor(r: {
    profile_id: string;
    first_name_he: string | null;
    last_name_he: string | null;
  }) {
    const profile = profileById.get(r.profile_id);
    return (
      [r.first_name_he, r.last_name_he].filter(Boolean).join(" ") ||
      profile?.display_name ||
      profile?.email ||
      "—"
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-(--color-brand-dark)">
        שליחים — ממתינים לאישור
      </h1>

      {pending.length === 0 ? (
        <p className="text-sm text-black/50">אין הרשמות הממתינות לאישור.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => {
            const profile = profileById.get(r.profile_id);
            const hasName = Boolean(r.first_name_he || r.last_name_he);
            const displayName = displayNameFor(r);
            const missingDetails =
              !hasName && !r.whatsapp_phone && !r.country;

            return (
              <div
                key={r.profile_id}
                className="rounded-xl bg-white border border-black/5 p-5 shadow-sm flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold">
                    {displayName}
                    {(r.first_name_local || r.last_name_local) && (
                      <span className="text-black/40 font-normal">
                        {" "}
                        ({r.first_name_local} {r.last_name_local})
                      </span>
                    )}
                  </div>
                  {profile?.email && (
                    <div className="text-xs text-black/40 mt-0.5">
                      {profile.email}
                    </div>
                  )}
                  <div className="text-xs text-black/50 mt-0.5">
                    {[
                      r.whatsapp_phone,
                      getCountryName(r.country) || null,
                      r.organization,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="text-xs text-black/40 mt-0.5">
                    {[
                      r.mission_location_name,
                      r.institution_type,
                      r.institution_city,
                      r.main_role,
                      r.activity_level
                        ? PARTICIPATION_LABEL_HE[r.activity_level] ??
                          r.activity_level
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {(r.mission_start_date || r.mission_end_date_expected) && (
                      <span>
                        {" "}
                        ({r.mission_start_date ? formatDateDMY(r.mission_start_date) : "?"}
                        {" — "}
                        {r.mission_end_date_expected
                          ? formatDateDMY(r.mission_end_date_expected)
                          : "?"}
                        )
                      </span>
                    )}
                  </div>
                  {missingDetails && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-2 inline-block">
                      חשבון זה נוצר ללא פרטי הרשמה מלאים (כנראה דרך מסך
                      &quot;הוספת משתמש&quot; במקום טופס ההרשמה). אין מה
                      לאשר — מומלץ לדחות ולבקש מהשליח להירשם דרך עמוד
                      ההרשמה.
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <RepReviewButtons profileId={r.profile_id} />
                  <Link
                    href={`/kkal/reps/${r.profile_id}`}
                    className="text-xs text-(--color-brand) underline"
                  >
                    עריכת פרטים
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div id="directory">
        <h2 className="font-semibold text-(--color-brand-dark) mb-1">
          כל השליחים במערכת
        </h2>
        <p className="text-xs text-black/50 mb-3">
          רשימה מלאה של כל השליחים בכל הסטטוסים, עם סינון וחיפוש חכם. אפשר
          לעדכן סטטוס ישירות (למשל לסמן כ&quot;לא פעיל&quot; שליח שסיים את
          השליחות), או ללחוץ &quot;עריכה&quot; לעדכון מלא של הפרטים.
        </p>
        {all.length === 0 ? (
          <p className="text-sm text-black/50">אין עדיין שליחים במערכת.</p>
        ) : (
          <RepsDirectoryTable
            exportHref="/kkal/reps/export"
            rows={all.map((r) => {
              const profile = profileById.get(r.profile_id);
              return {
                profileId: r.profile_id,
                displayName: displayNameFor(r),
                localName:
                  r.first_name_local || r.last_name_local
                    ? [r.first_name_local, r.last_name_local]
                        .filter(Boolean)
                        .join(" ")
                    : null,
                email: profile?.email ?? null,
                whatsappPhone: r.whatsapp_phone,
                missionPhone: r.mission_phone,
                country: r.country,
                organization: r.organization,
                institutionType: r.institution_type,
                institutionCity: r.institution_city,
                mainRole: r.main_role,
                activityLevel: r.activity_level,
                missionLocationName: r.mission_location_name,
                missionStartDate: r.mission_start_date,
                missionEndDateExpected: r.mission_end_date_expected,
                status: r.status,
                createdAt: r.created_at,
              } satisfies RepDirectoryRow;
            })}
          />
        )}
      </div>
    </div>
  );
}
