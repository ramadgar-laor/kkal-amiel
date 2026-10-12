"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeUserRole } from "@/lib/actions/admin";
import { ROLES } from "@/lib/validation/admin";

const ROLE_LABEL: Record<string, string> = {
  rep: "שליח",
  kkal: 'קק"ל',
  amiel: "עמיאל",
  admin: "מנהל מערכת",
};

export function AdminRoleSelect({
  profileId,
  role,
  disabled,
}: {
  profileId: string;
  role: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(newRole: string) {
    if (newRole === role) return;
    setPending(true);
    setError(null);
    const res = await changeUserRole({ profileId, role: newRole as never });
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        defaultValue={role}
        disabled={disabled || pending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
