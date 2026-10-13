"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AmielNav({
  labels,
}: {
  labels: {
    amielDashboard: string;
    amielInvoices: string;
    amielPayments: string;
    amielEvents: string;
  };
}) {
  const pathname = usePathname();

  const items = [
    { href: "/amiel", label: labels.amielDashboard },
    { href: "/amiel/invoices", label: labels.amielInvoices },
    { href: "/amiel/payments", label: labels.amielPayments },
    { href: "/amiel/events", label: labels.amielEvents },
  ];

  return (
    <nav
      aria-label={labels.amielDashboard}
      className="flex items-center gap-1 overflow-x-auto"
    >
      {items.map((item) => {
        const active =
          item.href === "/amiel"
            ? pathname === "/amiel"
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
