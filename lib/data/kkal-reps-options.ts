// Fixed option lists for the rep/ambassador registration form, copied
// verbatim from the real "תכנית שגרירי קק"ל" Google Form (the "ארגון
// השליחות שדרכו יצאת" and "סוג המוסד" radio questions). These lists are
// Hebrew-only in the real form regardless of UI language, so — unlike
// simple field labels — they are not duplicated in the he/en dictionary.

export const SENDING_ORGANIZATIONS = [
  "הסוכנות היהודית מסלול שש",
  "הסוכנות היהודית מסלול תנועתי",
  "הסוכנות היהודית מסלול קהילתי - אופק",
  "הסוכנות היהודית מסלול קהילתי - שחר",
  "הסוכנות היהודית מסלול קהילתי - בינה",
  "הסוכנות היהודית מסלול קהילתי - יובל",
  "הסוכנות היהודית מסלול נציגים",
  "ההסתדרות הציונית - נציגים ושליחי מחלקות",
  "ההסתדרות הציונית - שליחי הוראה",
  "ההסתדרות הציונית - בן עמי",
  "חפציבה - משרד החינוך והסוכנות היהודית",
  "תנועת נוער עולמיות - ללא המוסדות הלאומיים",
  "בנות שרות לאומי - בת עמי",
  "בנות שרות לאומי - אגודה להתנדבות",
  "התנועה הקונסרבטיבית",
  "התנועה הרפורמית",
  "תורה מציון",
  "שלהבת, מוסמכים, מנהיגות תורנית, לפידות",
  "שטראוס עמיאל",
] as const;

export const INSTITUTION_TYPES = [
  "גן",
  "בית ספר יסודי",
  "חטיבת ביניים",
  "תיכון",
  "תנועת נוער",
  "מחנה קיץ",
  "בית כנסת",
  "מרכז קהילתי",
  "פדרציה",
] as const;

// Sentinel value for the "Other:" radio option on both questions above —
// selecting it reveals a free-text field whose value is what actually gets
// saved (never this sentinel itself).
export const OTHER_OPTION = "__other__";
