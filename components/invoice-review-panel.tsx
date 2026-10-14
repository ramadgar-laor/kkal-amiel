"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideInvoice, type InvoiceDecision } from "@/lib/actions/invoices";

export function InvoiceReviewPanel({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<InvoiceDecision | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: InvoiceDecision) {
    setPending(true);
    setError(null);
    const result = await decideInvoice({
      id: invoiceId,
      decision,
      notes: notes || undefined,
    });
    setPending(false);
    if (result?.error) {
      setError(
        result.error === "notes_required"
          ? "יש לציין מה דורש תיקון"
          : "הפעולה נכשלה, נסה/י שוב"
      );
      return;
    }
    setMode(null);
    router.refresh();
  }

  if (mode === "rejected" || mode === "needs_correction") {
    const isCorrection = mode === "needs_correction";
    return (
      <div className="space-y-2 rounded-md border border-black/10 p-3">
        <label className="block text-xs font-medium mb-1">
          {isCorrection ? "מה דורש תיקון" : "הערות"}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-black/15 px-2 py-1.5 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => submit(mode)}
            disabled={pending || (isCorrection && !notes.trim())}
            className={`rounded-md text-sm font-medium px-3 py-1.5 disabled:opacity-60 text-white ${
              isCorrection
                ? "bg-(--color-gold) hover:opacity-90"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {pending
              ? "שולח..."
              : isCorrection
                ? "שליחה לתיקון השליח"
                : "אישור דחייה"}
          </button>
          <button
            onClick={() => setMode(null)}
            className="rounded-md border border-black/20 text-sm font-medium px-3 py-1.5 hover:bg-black/5"
          >
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => submit("approved")}
        disabled={pending}
        className="rounded-md bg-(--color-accent-dark) text-white text-sm font-medium px-3 py-1.5 hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "שולח..." : "אישור חשבונית"}
      </button>
      <button
        onClick={() => setMode("needs_correction")}
        className="rounded-md border border-(--color-gold) text-(--color-gold) text-sm font-medium px-3 py-1.5 hover:bg-(--color-gold-light)"
      >
        דורש תיקון מהשליח
      </button>
      <button
        onClick={() => setMode("rejected")}
        className="rounded-md border border-red-300 text-red-700 text-sm font-medium px-3 py-1.5 hover:bg-red-50"
      >
        דחייה
      </button>
    </div>
  );
}
