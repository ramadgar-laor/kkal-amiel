import Link from "next/link";
import { getCountryName } from "@/lib/data/countries";
import { US_COUNTRY_CODE, getUsStateName } from "@/lib/data/us-states";
import { hrefWithScope, type KkalScope } from "@/lib/kkal/scope";

// Strip shown above KKL lists for staff who have "my countries" set:
// says what's being shown and switches between "my countries" and "all".
// Renders nothing for users without an assignment (they always see all).
export function KkalScopeBanner({
  scope,
  path,
  searchParams,
  hiddenCount,
}: {
  scope: KkalScope;
  path: string;
  searchParams: Record<string, string | string[] | undefined>;
  // How many items exist outside the user's countries (shown as a hint).
  hiddenCount?: number;
}) {
  if (!scope.hasAssignment) return null;

  const names = scope.countries
    .map((c) => {
      if (c === US_COUNTRY_CODE && scope.usStates.length > 0) {
        return `${getCountryName(c)} (${scope.usStates
          .map((s) => getUsStateName(s))
          .join(", ")})`;
      }
      return getCountryName(c);
    })
    .join(", ");

  if (scope.showAll) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm">
        <span className="text-black/70">
          מוצגות <b>כל המדינות</b>.
        </span>
        <Link
          href={hrefWithScope(path, searchParams, false)}
          className="rounded-md bg-(--color-brand) text-white px-3 py-1.5 text-xs font-medium hover:bg-(--color-brand-dark) transition"
        >
          חזרה למדינות שלי
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--color-brand)/25 bg-(--color-brand-light)/60 px-4 py-2.5 text-sm">
      <span className="text-(--color-brand-dark)">
        מוצגות רק המדינות שבאחריותך: <b>{names}</b>
        {hiddenCount !== undefined && hiddenCount > 0 && (
          <span className="text-black/50"> · עוד {hiddenCount} במדינות אחרות</span>
        )}
      </span>
      <span className="flex items-center gap-3">
        <Link
          href="/profile"
          className="text-xs text-black/50 hover:text-(--color-brand-dark) underline"
        >
          עריכת המדינות
        </Link>
        <Link
          href={hrefWithScope(path, searchParams, true)}
          className="rounded-md border border-(--color-brand)/40 bg-white text-(--color-brand-dark) px-3 py-1.5 text-xs font-medium hover:bg-(--color-brand-light) transition"
        >
          הצגת כל המדינות
        </Link>
      </span>
    </div>
  );
}
