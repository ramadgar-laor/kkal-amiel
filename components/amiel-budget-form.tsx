"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addBudgetAllocation } from "@/lib/actions/amiel-budget";

export function AmielBudgetForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
  const labelClass = "block text-sm font-medium mb-1";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!amount.trim() || !Number.isFinite(amountNum) || amountNum <= 0) {
      setError("יש להזין סכום חיובי בשקלים");
      return;
    }

    setPending(true);
    const result = await addBudgetAllocation({ amountIls: amountNum, note });
    setPending(false);

    if (result?.error) {
      setError("השמירה נכשלה, נסה/י שוב");
      return;
    }

    setAmount("");
    setNote("");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3 sm:items-end"
    >
      <div>
        <label className={labelClass}>סכום שהתקבל (₪)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>הערה (אופציונלי)</label>
        <input
          className={inputClass}
          placeholder='למשל: תקציב ראשוני לשנת 2026'
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition disabled:opacity-60 h-[38px]"
      >
        {pending ? "שומר..." : "הוספה"}
      </button>
      {error && <p className="sm:col-span-3 text-xs text-red-600">{error}</p>}
    </form>
  );
}
