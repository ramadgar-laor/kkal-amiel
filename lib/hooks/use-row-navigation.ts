"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// Shared by every clickable-row directory table (invoices, reps, events,
// payments). A plain router.push() leaves the page looking unresponsive
// while the next page's data loads on the server -- people click again (or
// on a different row) thinking the first click didn't register.
// useTransition's isPending reflects exactly that wait, so each table can
// show a small spinner on the row that was actually clicked instead of
// nothing happening.
export function useRowNavigation() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function navigate(id: string, href: string) {
    if (isPending) return; // ignore extra clicks while one navigation is in flight
    setPendingId(id);
    startTransition(() => {
      router.push(href);
    });
  }

  return { navigate, isPending, pendingId };
}
