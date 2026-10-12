"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewEvent, type EventDecision } from "@/lib/actions/events";

export function EventReviewPanel({
  eventId,
  requestedAmount,
  currency,
}: {
  eventId: string;
  requestedAmount: number;
  currency: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<EventDecision | null>(null);
  const [amount, setAmount] = useState(String(requestedAmount));
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: EventDecision) {
    setPending(true);
    setError(null);
    const result = await reviewEvent({
      id: eventId,
      decision,
      approvedAmount:
        decision === "partially_approved" ? Number(amount) : undefined,
      notes: notes || undefined,
    });
    setPending(false);
    if (result?.error) {
      setError("הפעולה נכשלה, נסה/י שוב");
      return;
    }
    setMode(null);
    router.refresh();
  }

  if (mode === "partially_approved") {
    return (
      <div className="space-y-2 rounded-md border border-black/10 p-3">
        <label className="block text-xs font-medium">
          סכום מאושר ({currency})
        </label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1.5 text-sm"
        />
        <NotesField notes={notes} setNotes={setNotes} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <ActionButton
            label="אישור סכום חלקי"
            pending={pending}
            onClick={() => submit("partially_approved")}
            className="bg-(--color-gold) hover:opacity-90 text-white"
          />
          <CancelButton onClick={() => setMode(null)} />
        </div>
      </div>
    );
  }

  if (mode === "rejected" || mode === "info_requested") {
    return (
      <div className="space-y-2 rounded-md border border-black/10 p-3">
        <NotesField notes={notes} setNotes={setNotes} required />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <ActionButton
            label={mode === "rejected" ? "אישור דחייה" : "שליחת בקשת מידע"}
            pending={pending}
            onClick={() => submit(mode)}
            className="bg-red-600 hover:bg-red-700 text-white"
          />
          <CancelButton onClick={() => setMode(null)} />
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
        אישור מלא
      </button>
      <button
        onClick={() => setMode("partially_approved")}
        className="rounded-md bg-(--color-gold) text-white text-sm font-medium px-3 py-1.5 hover:opacity-90"
      >
        אישור חלקי
      </button>
      <button
        onClick={() => setMode("info_requested")}
        className="rounded-md border border-black/20 text-sm font-medium px-3 py-1.5 hover:bg-black/5"
      >
        בקשת מידע נוסף
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

function NotesField({
  notes,
  setNotes,
  required,
}: {
  notes: string;
  setNotes: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">
        הערות{required ? "" : " (לא חובה)"}
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-black/15 px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function ActionButton({
  label,
  pending,
  onClick,
  className,
}: {
  label: string;
  pending: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`rounded-md text-sm font-medium px-3 py-1.5 disabled:opacity-60 ${className}`}
    >
      {pending ? "שולח..." : label}
    </button>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-black/20 text-sm font-medium px-3 py-1.5 hover:bg-black/5"
    >
      ביטול
    </button>
  );
}
