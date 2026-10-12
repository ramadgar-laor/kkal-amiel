"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewRep } from "@/lib/actions/reps";

export function RepReviewButtons({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function act(decision: "approved" | "rejected") {
    setPending(true);
    await reviewRep({ profileId, decision });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => act("approved")}
        disabled={pending}
        className="rounded-md bg-(--color-accent-dark) text-white text-sm font-medium px-3 py-1.5 hover:opacity-90 disabled:opacity-60"
      >
        אישור
      </button>
      <button
        onClick={() => act("rejected")}
        disabled={pending}
        className="rounded-md border border-red-300 text-red-700 text-sm font-medium px-3 py-1.5 hover:bg-red-50 disabled:opacity-60"
      >
        דחייה
      </button>
    </div>
  );
}
