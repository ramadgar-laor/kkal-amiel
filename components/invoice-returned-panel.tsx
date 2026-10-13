"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  resolveReturnedInvoice,
  type ReturnedInvoiceResolution,
} from "@/lib/actions/invoices";

// Shown on kkal's invoice detail page when Amiel sent the invoice back with
// payment_status = "returned_to_rep" (item 6). Rami's answer to "what
// should kkal be able to do with it" was "no preference", so both options
// implied by the spec ("kkal decides what to do with the invoice") are
// offered: send it back to Amiel to continue processing, or reject the
// invoice outright (reversing kkal's original approval).
export function InvoiceReturnedPanel({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<ReturnedInvoiceResolution | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(resolution: ReturnedInvoiceResolution) {
    setPending(true);
    setError(null);
    const result = await resolveReturnedInvoice({
      id: invoiceId,
      resolution,
      notes: notes || undefined,
    });
    setPending(false);
    if (result?.error) {
      setError(
        result.error === "notes_required"
          ? "יש לציין סיבת דחייה"
          : "הפעולה נכשלה, נסה/י שוב"
      );
      return;
    }
    setMode(null);
    router.refresh();
  }

  if (mode === "reject") {
    return (
      <div className="space-y-2 rounded-md border border-black/10 p-3">
        <label className="block text-xs font-medium mb-1">סיבת דחייה</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-black/15 px-2 py-1.5 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => submit("reject")}
            disabled={pending}
            className="rounded-md text-sm font-medium px-3 py-1.5 disabled:opacity-60 bg-red-600 hover:bg-red-700 text-white"
          >
            {pending ? "שולח..." : "אישור דחייה"}
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
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => submit("send_to_amiel")}
          disabled={pending}
          className="rounded-md bg-(--color-accent-dark) text-white text-sm font-medium px-3 py-1.5 hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "שולח..." : "החזרה לעמיאל להמשך טיפול"}
        </button>
        <button
          onClick={() => setMode("reject")}
          className="rounded-md border border-red-300 text-red-700 text-sm font-medium px-3 py-1.5 hover:bg-red-50"
        >
          דחיית החשבונית
        </button>
      </div>
    </div>
  );
}
