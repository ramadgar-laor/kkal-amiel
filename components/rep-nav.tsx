"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function RepNav({
  labels,
}: {
  labels: {
    repDashboard: string;
  };
}) {
  const pathname = usePathname();
  const active = pathname === "/rep";

  return (
    <nav aria-label={labels.repDashboard} className="flex items-center gap-1">
      <Link
        href="/rep"
        className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
          active
            ? "bg-(--color-brand-light) text-(--color-brand-dark)"
            : "text-black/60 hover:bg-black/5 hover:text-(--color-brand-dark)"
        }`}
      >
        {labels.repDashboard}
      </Link>
    </nav>
  );
}
