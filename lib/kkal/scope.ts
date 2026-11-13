import { createClient } from "@/lib/supabase/server";
import { US_COUNTRY_CODE } from "@/lib/data/us-states";

// "My countries" scope for KKL staff screens. Each KKL user can pick the
// countries (and, for the US, the states) they're responsible for on
// /profile. Their lists then show only those countries by default, with a
// one-click switch to everything (?scope=all). A KKL user with no countries
// picked -- and every admin -- simply sees everything, with no switch.

export const SCOPE_PARAM = "scope";
export const SCOPE_ALL = "all";

export type KkalScope = {
  countries: string[];
  usStates: string[];
  // The user has an assignment at all (otherwise always "everything").
  hasAssignment: boolean;
  // The user asked to see everything despite having an assignment.
  showAll: boolean;
  // Whether rows should actually be filtered right now.
  active: boolean;
};

type SearchParams = Record<string, string | string[] | undefined>;

export async function getKkalScope(sp: SearchParams): Promise<KkalScope> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  let countries: string[] = [];
  let usStates: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, responsible_countries, responsible_us_states")
      .eq("id", user.id)
      .single();
    // Only KKL staff are scoped; admins always see everything.
    if (data?.role === "kkal") {
      countries = data.responsible_countries ?? [];
      usStates = data.responsible_us_states ?? [];
    }
  }

  const raw = sp[SCOPE_PARAM];
  const showAll = (Array.isArray(raw) ? raw[0] : raw) === SCOPE_ALL;
  const hasAssignment = countries.length > 0;
  return {
    countries,
    usStates,
    hasAssignment,
    showAll,
    active: hasAssignment && !showAll,
  };
}

// Does a row from `country` (and, for the US, `state`) belong in view?
// For US rows: if the user picked specific states, the row must be in one
// of them -- but a row with no state on record is kept rather than hidden,
// so nothing silently disappears because of missing data.
export function inScope(
  scope: KkalScope,
  country: string | null | undefined,
  state?: string | null
): boolean {
  if (!scope.active) return true;
  if (!country || !scope.countries.includes(country)) return false;
  if (country === US_COUNTRY_CODE && scope.usStates.length > 0 && state) {
    return scope.usStates.includes(state);
  }
  return true;
}

// Build a link to `path` keeping the current query string, with the scope
// toggled on/off. Used by the banner and by dashboard cards so the "all"
// choice carries over when moving between screens.
export function hrefWithScope(
  path: string,
  sp: SearchParams,
  showAll: boolean
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === SCOPE_PARAM || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  if (showAll) params.set(SCOPE_PARAM, SCOPE_ALL);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
