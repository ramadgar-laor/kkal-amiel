"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Admin gets a single combined nav with everything kkal and amiel staff
// can reach, plus its own user-management and settings screens -- since
// an admin user can go anywhere in the system (see lib/supabase/middleware.ts).
export function AdminNav({
  labels,
}: {
  labels: {
    adminUsers: string;
    adminSettings: string;
    kkalReps: string;
    kkalEvents: string;
    kkalInvoices: string;
    amielDashboard: string;
    amielInvoices: string;
    amielEvents: string;
  };
}) {
  const pathname = usePathname();

  const items = [
    { href: "/admin", label: labels.adminUsers, exact: true },
    { href: "/admin/settings", label: labels.adminSettings, exact: false },
    { href: "/kkal/reps", label: labels.kkalReps, exact: false },
    { href: "/kkal/events", label: labels.kkalEvents, exact: false },
    { href: "/kkal/invoices", label: labels.kkalInvoices, exact: false },
    { href: "/amiel", label: labels.amielDashboard, exact: true },
    { href: "/amiel/invoices", label: labels.amielInvoices, exact: false },
    { href: "/amiel/events", label: labels.amielEvents, exact: false },
  ];

  return (
    <nav
      aria-label={labels.adminUsers}
      className="flex items-center gap-1 overflow-x-auto"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-(--color-brand-light) text-(--color-brand-dark)"
                : "text-black/60 hover:bg-black/5 hover:text-(--color-brand-dark)"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
