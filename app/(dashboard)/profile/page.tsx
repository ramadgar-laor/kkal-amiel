import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";
import { formatCountryWithState } from "@/lib/data/us-states";
import {
  ChangePasswordForm,
  RegionsForm,
  RepNameForm,
  StaffNameForm,
} from "@/components/profile-forms";

// Personal profile for every signed-in user (ambassador, KKL, Amiel,
// admin). Reachable from the profile menu in the header. Email is shown
// read-only; ambassadors sign in with a magic link so they have no
// password section; KKL staff also pick the countries they handle.

const sectionClass =
  "rounded-xl bg-white border border-black/5 shadow-sm p-5 space-y-4";
const sectionTitleClass = "font-semibold text-(--color-brand-dark)";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-black/50">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export default async function ProfilePage() {
  const { locale, dict } = await getTranslations();
  const d = dict.profile;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, display_name, responsible_countries, responsible_us_states")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const role = profile.role as "rep" | "kkal" | "amiel" | "admin";
  const roleLabel = dict.roles[role] ?? role;
  const email = profile.email ?? user.email ?? "";

  const { data: rep } =
    role === "rep"
      ? await supabase
          .from("reps")
          .select(
            "first_name_he, last_name_he, first_name_local, last_name_local, whatsapp_phone, country, state, organization, activity_level, status"
          )
          .eq("profile_id", user.id)
          .maybeSingle()
      : { data: null };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-(--color-brand-dark)">{d.title}</h1>
        <p className="text-sm text-black/60 mt-1">{d.subtitle}</p>
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{d.sectionAccount}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-black/50">{d.email}</div>
            <div className="text-sm font-medium" dir="ltr">{email}</div>
            <div className="text-xs text-black/40 mt-0.5">{d.emailLocked}</div>
          </div>
          <Row label={d.role} value={roleLabel} />
        </div>

        {role === "rep" ? (
          <RepNameForm
            d={d}
            initial={{
              firstNameHe: rep?.first_name_he ?? "",
              lastNameHe: rep?.last_name_he ?? "",
              firstNameLocal: rep?.first_name_local ?? "",
              lastNameLocal: rep?.last_name_local ?? "",
            }}
          />
        ) : (
          <StaffNameForm d={d} initialName={profile.display_name ?? ""} />
        )}
      </section>

      {role === "rep" && rep && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{d.sectionRepDetails}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Row label={d.phone} value={rep.whatsapp_phone} />
            <Row
              label={d.country}
              value={formatCountryWithState(rep.country, rep.state, locale)}
            />
            <Row label={d.organization} value={rep.organization} />
            <Row
              label={d.participation}
              value={
                rep.activity_level
                  ? (d.participationLevels[
                      rep.activity_level as keyof typeof d.participationLevels
                    ] ?? rep.activity_level)
                  : null
              }
            />
            <Row
              label={d.status}
              value={d.repStatuses[rep.status as keyof typeof d.repStatuses] ?? rep.status}
            />
          </div>
          <p className="text-xs text-black/50">{d.repDetailsNote}</p>
        </section>
      )}

      {role === "kkal" && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{d.sectionRegions}</h2>
          <RegionsForm
            d={d}
            locale={locale}
            initialCountries={profile.responsible_countries ?? []}
            initialStates={profile.responsible_us_states ?? []}
          />
        </section>
      )}

      {role !== "rep" && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{d.sectionPassword}</h2>
          <ChangePasswordForm d={d} email={email} />
        </section>
      )}
    </div>
  );
}
