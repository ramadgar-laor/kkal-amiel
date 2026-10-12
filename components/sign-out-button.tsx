"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
  className = "text-sm text-(--color-brand) underline hover:text-(--color-brand-dark)",
  label = "התנתקות",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} className={className}>
      {label}
    </button>
  );
}
