"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setRepStatus } from "@/lib/actions/reps";
import type { RepStatus } from "@/lib/validation/rep-edit";

const STATUS_LABEL: Record<RepStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
  inactive: "לא פעיל",
};

export function RepStatusSelect({
  profileId,
  status,
}: {
  profileId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as RepStatus;
    setPending(true);
    setError(false);
    const res = await setRepStatus(profileId, value);
    setPending(false);
    if (res?.error) {
      setError(true);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <select
        defaultValue={status}
        disabled={pending}
        onChange={onChange}
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs focus:outline-2 focus:outline-(--color-brand) disabled:opacity-60"
      >
        {(Object.keys(STATUS_LABEL) as RepStatus[]).map((value) => (
          <option key={value} value={value}>
            {STATUS_LABEL[value]}
          </option>
        ))}
      </select>
      {error && <span className="text-[10px] text-red-600">העדכון נכשל</span>}
    </div>
  );
}
