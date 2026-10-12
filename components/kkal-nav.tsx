"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function KkalNav({
  labels,
}: {
  labels: { kkalReps: string; kkalEvents: string; kkalInvoices: string };
}) {
  const pathname = usePathname();

  const items = [
    { href: "/kkal/reps", label: labels.kkalReps },
    { href: "/kkal/events", label: labels.kkalEvents },
    { href: "/kkal/invoices", label: labels.kkalInvoices },
  ];

  return (
    <nav
      aria-label={labels.kkalReps}
      className="flex items-center gap-1 overflow-x-auto"
    >
      {items.map((item) => {
        const active = pathname?.startsWith(item.href);
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
