import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

const STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  submitted: "bg-amber-100 text-amber-800",
  info_requested: "bg-amber-100 text-amber-800",
  approved: "bg-(--color-accent-light) text-(--color-accent-dark)",
  partially_approved: "bg-(--color-gold-light) text-(--color-gold)",
  rejected: "bg-red-100 text-red-700",
  inactive: "bg-black/5 text-black/50",
  not_sent: "bg-black/5 text-black/60",
  received_for_review: "bg-amber-100 text-amber-800",
  approved_for_payment: "bg-(--color-accent-light) text-(--color-accent-dark)",
  paid: "bg-(--color-accent-light) text-(--color-accent-dark)",
  returned_to_kkal: "bg-red-100 text-red-700",
  returned_to_rep: "bg-(--color-gold-light) text-(--color-gold)",
};

export function StatusBadge({
  status,
  locale = "he",
}: {
  status: string;
  locale?: Locale;
}) {
  const dict = getDictionary(locale);
  const labels: Record<string, string> = dict.statusBadge;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STYLES[status] ?? "bg-black/5 text-black/60"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
