"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBudgetAllocation } from "@/lib/actions/amiel-budget";
import { formatDateDMY } from "@/lib/utils/date";

export type AmielBudgetAllocationRow = {
  id: string;
  amountIls: number;
  note: string | null;
  createdAt: string | null;
  addedByName: string | null;
};

export function AmielBudgetAllocationsList({
  allocations,
}: {
  allocations: AmielBudgetAllocationRow[];
}) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setError(null);
    setPendingId(id);
    const result = await deleteBudgetAllocation(id);
    setPendingId(null);

    if (result?.error) {
      setError("המחיקה נכשלה, נסה/י שוב");
      return;
    }

    setConfirmingId(null);
    router.refresh();
  }

  return (
    <div className="divide-y divide-black/5">
      {error && <p className="py-2 text-xs text-red-600">{error}</p>}
      {allocations.map((a) => {
        const isConfirming = confirmingId === a.id;
        const isPending = pendingId === a.id;
        return (
          <div
            key={a.id}
            className="py-2 flex items-center justify-between gap-3 text-sm"
          >
            <div>
              <div className="font-medium">
                ₪{a.amountIls.toLocaleString("he-IL")}
              </div>
              {a.note && <div className="text-xs text-black/50">{a.note}</div>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-black/40 text-end">
                <div>{formatDateDMY(a.createdAt)}</div>
                {a.addedByName && <div>{a.addedByName}</div>}
              </div>
              {isConfirming ? (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-xs text-red-600">למחוק?</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(a.id)}
                    className="rounded-md bg-red-600 text-white text-xs font-medium px-2.5 py-1 hover:bg-red-700 transition disabled:opacity-60"
                  >
                    {isPending ? "מוחק..." : "כן, למחוק"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirmingId(null)}
                    className="rounded-md border border-black/15 text-xs font-medium px-2.5 py-1 hover:bg-black/5 transition"
                  >
                    ביטול
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(a.id)}
                  className="rounded-md border border-black/15 text-xs font-medium px-2.5 py-1 text-black/50 hover:border-red-300 hover:text-red-600 transition"
                >
                  מחיקה
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
