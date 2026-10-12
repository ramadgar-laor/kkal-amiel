"use client";

import { useState } from "react";
import { RepLoginForm } from "@/components/rep-login-form";
import { LoginForm } from "@/components/login-form";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function LoginTabs({ dict }: { dict: Dictionary }) {
  const [tab, setTab] = useState<"rep" | "staff">("rep");

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md py-2 text-sm font-medium transition ${
      active
        ? "bg-(--color-brand) text-white"
        : "bg-black/5 text-black/60 hover:bg-black/10"
    }`;

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          className={tabClass(tab === "rep")}
          onClick={() => setTab("rep")}
        >
          {dict.login.repTab}
        </button>
        <button
          type="button"
          className={tabClass(tab === "staff")}
          onClick={() => setTab("staff")}
        >
          {dict.login.staffTab}
        </button>
      </div>

      {tab === "rep" ? (
        <RepLoginForm dict={dict} />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-black/70">{dict.login.staffSubtitle}</p>
          <LoginForm dict={dict} />
        </div>
      )}
    </div>
  );
}
