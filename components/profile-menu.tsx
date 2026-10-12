"use client";

import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";

export function ProfileMenu({
  displayName,
  roleLabel,
  logoutLabel,
}: {
  displayName: string;
  roleLabel: string;
  logoutLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-black/5 transition"
      >
        <span className="font-medium text-(--color-brand-dark) max-w-[12rem] truncate">
          {displayName}
        </span>
        <span className="inline-block rounded-full bg-(--color-accent-light) text-(--color-accent-dark) px-2.5 py-0.5 text-xs font-medium">
          {roleLabel}
        </span>
        <span
          className={`text-black/40 text-xs transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full mt-1 w-44 rounded-lg bg-white border border-black/10 shadow-lg py-1 z-20"
        >
          <SignOutButton
            label={logoutLabel}
            className="w-full text-start px-3 py-2 text-sm text-black/70 hover:bg-black/5"
          />
        </div>
      )}
    </div>
  );
}
