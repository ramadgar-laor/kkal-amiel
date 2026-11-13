// US states (50 + DC) for the "state within the US" select, shown
// whenever the selected country is the United States (rep registration,
// rep edit, and KKL staff responsibility areas). Stored as the 2-letter
// USPS code (e.g. "NY") -- getUsStateName() resolves it for display, and
// falls back to the raw value for older free-text entries.
import { getCountryName } from "@/lib/data/countries";

export const US_COUNTRY_CODE = "US";

export const US_STATES_HE: { code: string; name: string }[] = [
  { code: "OH", name: "אוהיו" },
  { code: "OK", name: "אוקלהומה" },
  { code: "OR", name: "אורגון" },
  { code: "IA", name: "איווה" },
  { code: "ID", name: "איידהו" },
  { code: "IL", name: "אילינוי" },
  { code: "IN", name: "אינדיאנה" },
  { code: "AL", name: "אלבמה" },
  { code: "AK", name: "אלסקה" },
  { code: "AZ", name: "אריזונה" },
  { code: "AR", name: "ארקנסו" },
  { code: "GA", name: "ג׳ורג׳יה" },
  { code: "DE", name: "דלאוור" },
  { code: "SD", name: "דקוטה הדרומית" },
  { code: "ND", name: "דקוטה הצפונית" },
  { code: "HI", name: "הוואי" },
  { code: "WA", name: "וושינגטון" },
  { code: "WY", name: "ויומינג" },
  { code: "WI", name: "ויסקונסין" },
  { code: "VA", name: "וירג׳יניה" },
  { code: "WV", name: "וירג׳יניה המערבית" },
  { code: "VT", name: "ורמונט" },
  { code: "TN", name: "טנסי" },
  { code: "TX", name: "טקסס" },
  { code: "UT", name: "יוטה" },
  { code: "LA", name: "לואיזיאנה" },
  { code: "MT", name: "מונטנה" },
  { code: "DC", name: "מחוז קולומביה (וושינגטון די.סי.)" },
  { code: "MO", name: "מיזורי" },
  { code: "ME", name: "מיין" },
  { code: "MN", name: "מינסוטה" },
  { code: "MS", name: "מיסיסיפי" },
  { code: "MI", name: "מישיגן" },
  { code: "MA", name: "מסצ׳וסטס" },
  { code: "MD", name: "מרילנד" },
  { code: "NV", name: "נבדה" },
  { code: "NE", name: "נברסקה" },
  { code: "NJ", name: "ניו ג׳רזי" },
  { code: "NH", name: "ניו המפשייר" },
  { code: "NY", name: "ניו יורק" },
  { code: "NM", name: "ניו מקסיקו" },
  { code: "FL", name: "פלורידה" },
  { code: "PA", name: "פנסילבניה" },
  { code: "CO", name: "קולורדו" },
  { code: "CT", name: "קונטיקט" },
  { code: "CA", name: "קליפורניה" },
  { code: "KS", name: "קנזס" },
  { code: "KY", name: "קנטקי" },
  { code: "SC", name: "קרוליינה הדרומית" },
  { code: "NC", name: "קרוליינה הצפונית" },
  { code: "RI", name: "רוד איילנד" },
];

export const US_STATES_EN: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export const US_STATE_CODES = new Set(US_STATES_EN.map((s) => s.code));

const HE_BY_CODE: Record<string, string> = Object.fromEntries(
  US_STATES_HE.map((s) => [s.code, s.name])
);
const EN_BY_CODE: Record<string, string> = Object.fromEntries(
  US_STATES_EN.map((s) => [s.code, s.name])
);

export function getUsStateName(
  code: string | null | undefined,
  locale: "he" | "en" = "he"
): string {
  if (!code) return "";
  const table = locale === "en" ? EN_BY_CODE : HE_BY_CODE;
  return table[code] ?? code;
}

export function usStatesFor(locale: "he" | "en") {
  return locale === "en" ? US_STATES_EN : US_STATES_HE;
}

// "ארצות הברית · ניו יורק" for US reps, plain country name otherwise.
export function formatCountryWithState(
  country: string | null | undefined,
  state: string | null | undefined,
  locale: "he" | "en" = "he"
): string {
  const name = getCountryName(country, locale);
  if (country === US_COUNTRY_CODE && state) {
    return `${name} · ${getUsStateName(state, locale)}`;
  }
  return name;
}
