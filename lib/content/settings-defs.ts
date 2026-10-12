// The fixed list of admin-editable text settings, shown on /admin/settings.
// Adding a new editable block later just means adding an entry here (plus
// a seed row in system_settings) and reading it where it's used -- no
// schema change needed.
export type SettingDef = {
  key: string;
  label: string;
  hint: string;
};

export const SETTINGS_DEFS: SettingDef[] = [
  {
    key: "register_intro_he",
    label: 'טקסט מקדים — טופס הרשמת שליח (עברית)',
    hint: "מוצג בראש טופס ההרשמה (/register) כשהשפה מוגדרת לעברית.",
  },
  {
    key: "register_intro_en",
    label: "Intro text — ambassador registration form (English)",
    hint: "Shown at the top of the registration form (/register) when the language is set to English.",
  },
  {
    key: "new_event_intro_he",
    label: 'טקסט מקדים — טופס בקשת תקציב לאירוע',
    hint: "מוצג בראש טופס האירוע החדש (/rep/events/new). הטופס הזה בעברית בלבד.",
  },
];
