"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type AdminNavLabels = {
  adminDashboard: string;
  adminUsers: string;
  adminSettings: string;
  kkalDashboard: string;
  kkalReps: string;
  kkalEvents: string;
  kkalInvoices: string;
  amielDashboard: string;
  amielInvoices: string;
  amielEvents: string;
  amielPayments: string;
  amielBudget: string;
  groupKkal: string;
  groupAmiel: string;
};

type NavItem = { href: string; label: string; active: boolean };

// A dropdown group so the nav doesn't have to lay out every kkal/amiel
// screen as its own top-level link (that's what made the admin nav overflow
// on anything narrower than a wide desktop window). Built on <details> so
// open/close doesn't need its own click-outside wiring beyond closing when
// a link inside is actually chosen or the user clicks elsewhere.
function NavGroup({ label, active, items }: { label: string; active: boolean; items: NavItem[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function close() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className={`list-none marker:content-none [&::-webkit-details-marker]:hidden cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition select-none ${
          active
            ? "bg-(--color-brand-light) text-(--color-brand-dark)"
            : "text-black/60 hover:bg-black/5 hover:text-(--color-brand-dark)"
        }`}
      >
        {label} ▾
      </summary>
      <div className="absolute end-0 top-full mt-1 min-w-48 rounded-md border border-black/10 bg-white py-1 shadow-lg z-20">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className={`block whitespace-nowrap px-3 py-2 text-sm transition ${
              item.active
                ? "bg-(--color-brand-light) text-(--color-brand-dark) font-medium"
                : "text-black/70 hover:bg-black/5"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

// Admin gets a single combined nav with everything kkal and amiel staff
// can reach, plus its own user-management and settings screens -- since
// an admin user can go anywhere in the system (see lib/supabase/middleware.ts).
// Grouped into dropdowns (kk"l / amiel) rather than one flat row of 8 links,
// which used to overflow/wrap on anything but a wide window.
export function AdminNav({ labels }: { labels: AdminNavLabels }) {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : !!pathname?.startsWith(href);

  const kkalItems: NavItem[] = [
    { href: "/kkal", label: labels.kkalDashboard, active: pathname === "/kkal" },
    { href: "/kkal/reps", label: labels.kkalReps, active: isActive("/kkal/reps") },
    { href: "/kkal/events", label: labels.kkalEvents, active: isActive("/kkal/events") },
    { href: "/kkal/invoices", label: labels.kkalInvoices, active: isActive("/kkal/invoices") },
  ];

  const amielItems: NavItem[] = [
    { href: "/amiel", label: labels.amielDashboard, active: pathname === "/amiel" },
    { href: "/amiel/invoices", label: labels.amielInvoices, active: isActive("/amiel/invoices") },
    { href: "/amiel/events", label: labels.amielEvents, active: isActive("/amiel/events") },
    { href: "/amiel/payments", label: labels.amielPayments, active: isActive("/amiel/payments") },
    { href: "/amiel/budget", label: labels.amielBudget, active: isActive("/amiel/budget") },
  ];

  const flatItems = [
    { href: "/admin", label: labels.adminDashboard, active: pathname === "/admin" },
    { href: "/admin/users", label: labels.adminUsers, active: isActive("/admin/users") },
    { href: "/admin/settings", label: labels.adminSettings, active: isActive("/admin/settings") },
  ];

  return (
    <nav aria-label={labels.adminDashboard} className="flex items-center gap-1">
      <Link
        href={flatItems[0].href}
        className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
          flatItems[0].active
            ? "bg-(--color-brand-light) text-(--color-brand-dark)"
            : "text-black/60 hover:bg-black/5 hover:text-(--color-brand-dark)"
        }`}
      >
        {flatItems[0].label}
      </Link>

      <NavGroup label={labels.groupKkal} active={kkalItems.some((i) => i.active)} items={kkalItems} />
      <NavGroup label={labels.groupAmiel} active={amielItems.some((i) => i.active)} items={amielItems} />

      {flatItems.slice(1).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
            item.active
              ? "bg-(--color-brand-light) text-(--color-brand-dark)"
              : "text-black/60 hover:bg-black/5 hover:text-(--color-brand-dark)"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
