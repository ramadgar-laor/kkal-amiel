"use client";

import { useState } from "react";
import { updateSystemSetting } from "@/lib/actions/settings";
import { renderLiteMarkdown } from "@/lib/content/lite-markdown";
import type { SettingDef } from "@/lib/content/settings-defs";

const SYNTAX_HELP =
  'שורה ריקה = פסקה חדשה. "# כותרת" לכותרת ראשית, "## כותרת" לכותרת משנה, שורות שמתחילות ב-"- " לרשימה, שורות שמתחילות ב-"1. " לרשימה ממוספרת, שורה שמתחילה ב-"> " לטקסט קטן ואפור, ו-**טקסט** להדגשה. בלי HTML — אי אפשר "לשבור" את הטופס.';

function SettingEditor({ def, initialValue }: { def: SettingDef; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateSystemSetting(def.key, value);
    setPending(false);
    if (result?.error) {
      setError("השמירה נכשלה, נסה/י שוב");
      return;
    }
    setSaved(true);
  }

  return (
    <div className="rounded-xl bg-white border border-black/5 p-5 shadow-sm space-y-3">
      <div>
        <h3 className="font-semibold text-(--color-brand-dark)">{def.label}</h3>
        <p className="text-xs text-black/50 mt-0.5">{def.hint}</p>
      </div>

      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        rows={12}
        dir="auto"
        className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-mono leading-relaxed focus:outline-2 focus:outline-(--color-brand)"
      />

      <p className="text-xs text-black/40">{SYNTAX_HELP}</p>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
        >
          {pending ? "שומר..." : "שמירה"}
        </button>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="rounded-md border border-black/15 text-sm font-medium px-4 py-2 hover:bg-black/5 transition"
        >
          {showPreview ? "הסתרת תצוגה מקדימה" : "תצוגה מקדימה"}
        </button>
        {saved && (
          <span className="text-xs text-(--color-accent-dark)">נשמר בהצלחה.</span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {showPreview && (
        <div className="rounded-lg border border-(--color-brand)/20 bg-(--color-brand-light) p-5 text-sm leading-relaxed space-y-3">
          {renderLiteMarkdown(value) ?? (
            <p className="text-black/40">(ריק)</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminSettingsForm({
  defs,
  values,
}: {
  defs: SettingDef[];
  values: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      {defs.map((def) => (
        <SettingEditor key={def.key} def={def} initialValue={values[def.key] ?? ""} />
      ))}
    </div>
  );
}
