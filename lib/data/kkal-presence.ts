// The "KKL presence & visibility at the event" checklist, copied verbatim
// (key wording) from the real KKL event-budget-request Google Form. Staff
// require at least 4 selections from this list, on top of the 2 KKL flags
// every event must display regardless (handled as a fixed note, not a
// selectable item here).
export const KKAL_PRESENCE_MIN_SELECTIONS = 4;

export const KKAL_PRESENCE_OPTIONS: {
  key: string;
  label: string;
  labelEn: string;
}[] = [
  {
    key: "clip_video",
    label:
      'קליפ / סרטון קק"ל המותאם לאירוע. קליפ מתוך המאגר שלנו: https://www.youtube.com/playlist?list=PLU732s52AfPV3Q_WtF9hgXh3SzOH0ISah',
    labelEn:
      "A KKL video clip tailored to the event. A clip from our library: https://www.youtube.com/playlist?list=PLU732s52AfPV3Q_WtF9hgXh3SzOH0ISah",
  },
  {
    key: "recorded_greeting",
    label: 'ברכה מוקלטת מנציג קק"ל שתוצג בפתיחת האירוע',
    labelEn:
      "A recorded greeting from a KKL representative to be shown at the opening of the event",
  },
  {
    key: "local_office_speaker",
    label: 'דובר מטעם לשכת קק"ל המקומית במידה שיש',
    labelEn: "A speaker on behalf of the local KKL office, if there is one",
  },
  {
    key: "stage_banner",
    label: 'באנר קק"ל בחזית הבמה',
    labelEn: "A KKL banner at the front of the stage",
  },
  {
    key: "social_media_logo",
    label: 'לוגו קק"ל בפרסום האירוע ברשתות החברתיות ואו בדיוור במייל',
    labelEn:
      "The KKL logo in the event's publicity on social media and/or in email mailings",
  },
  {
    key: "print_logo",
    label:
      'לוגו קק"ל בפרסום האירוע באופן מודפס (מכתבים להורים, מכתבים לחברי הקהילה, פוסטרים, פלאיירים)',
    labelEn:
      "The KKL logo in printed publicity for the event (letters to parents, letters to community members, posters, flyers)",
  },
  {
    key: "flag_chain",
    label: 'שרשרת דגלי קק"ל לתלייה במקום האירוע',
    labelEn: "A chain of KKL flags to hang at the event venue",
  },
  {
    key: "rollup_banner",
    label: 'רול אפ - Roll-up Banner עם לוגו קק"ל',
    labelEn: "A roll-up banner with the KKL logo",
  },
  {
    key: "blue_box_craft",
    label:
      'עמדת יצירה "בנה את הקופסה הכחולה": ערכות להרכבה וצביעה של הקופסה הכחולה המפורסמת, שבהן הילדים יכולים להתחיל לאסוף כסף למטרות ירוקות',
    labelEn:
      'A "build the Blue Box" craft station: kits for assembling and decorating the famous JNF Blue Box, where children can start collecting money for green causes',
  },
  {
    key: "blue_box_decor",
    label:
      '"הקופסה הכחולה" כאלמנט עיצובי: הצבת דגמי ענק של הקופסה הכחולה בנקודות אסטרטגיות (כניסה, עמדת רישום). זהו הסמל המזוהה ביותר של קק"ל',
    labelEn:
      'The "Blue Box" as a design element: placing giant Blue Box models at strategic points (entrance, registration desk). This is KKL\'s most recognizable symbol',
  },
  {
    key: "photo_booth",
    label:
      'קיר צילום (Photo Booth): רקע מעוצב עם נופי ישראל, יערות קק"ל ולוגו הארגון, הכולל אביזרים (פרופס) כמו כובעי טמבל, מזמרות, או שלטים עם הכיתוב "נוטע בלב, בונה בארץ"',
    labelEn:
      'A photo booth: a designed backdrop with Israeli landscapes, KKL forests and the organization\'s logo, including props such as kibbutz-style hats, pruning shears, or signs reading "Planting in the heart, building the land"',
  },
  {
    key: "functional_branding",
    label:
      'מיתוג פונקציונלי: שימוש במוצרים ממותגי קק"ל שמשתתפים צריכים במהלך האירוע: מפיות, מחזיקי כוסות, שקיות מתנה, או אפילו צמידי סיליקון בכחול-לבן',
    labelEn:
      "Functional branding: using KKL-branded products that participants need during the event: napkins, cup holders, gift bags, or even blue-and-white silicone wristbands",
  },
  {
    key: "fingerprint_wall",
    label:
      'קיר "טביעת אצבע": יצירת ציור של עץ גדול על קנבס, שבו כל משתתף מוסיף "עלה" באמצעות טביעת אצבע בירוק. בסוף האירוע נוצרת תמונה קהילתית המוקדשת לקק"ל',
    labelEn:
      'A "fingerprint" wall: creating a drawing of a large tree on canvas, where each participant adds a "leaf" with a green fingerprint. At the end of the event a community picture dedicated to KKL is created',
  },
  {
    key: "kahoot_trivia",
    label:
      'חידון טריוויה אינטראקטיבי (Kahoot): חידון על מסך מרכזי בנושאי ציונות, סביבה וקק"ל, עם פרסים קטנים למנצחים',
    labelEn:
      "An interactive trivia quiz (Kahoot) on a central screen about Zionism, the environment and KKL, with small prizes for winners",
  },
  {
    key: "plant_and_take",
    label:
      'עמדת "שתול וקח": חלוקת עציצים קטנים או ערכות זריעה ממותגות של צמחי תבלין ארץ-ישראליים (אזוב, נענע)',
    labelEn:
      'A "plant and take" station: distributing small pots or branded seed kits of Israeli herbs (hyssop, mint)',
  },
  {
    key: "green_restoration_display",
    label:
      'מיצג "השיקום הירוק": אם מדובר באירוע גדול, ניתן להציב תערוכת תמונות "לפני ואחרי" של פרויקטים סביבתיים (שיקום נחלים, פריחת הנגב)',
    labelEn:
      'A "green restoration" display: for a large event, a "before and after" photo exhibit of environmental projects (river restoration, the Negev blooming) can be set up',
  },
  {
    key: "qr_wall",
    label:
      'קיר QR אינטראקטיבי: קיר גדול עם קודי QR שכל אחד מהם מוביל לסיפור אחר (סרטון קצר, סיור 360 מעלות ביער, או סיפור הצלחה של פרויקט קק"ל)',
    labelEn:
      "An interactive QR wall: a large wall with QR codes, each leading to a different story (a short video, a 360-degree tour of a forest, or a KKL project success story)",
  },
  {
    key: "social_filter",
    label:
      'פילטר אינסטגרם/טיקטוק ייעודי: יצירת פילטר לאירוע הכולל אלמנטים של קק"ל (כמו כובע טמבל ונופי ישראל) עם האשטאג ייעודי של הקהילה וקק"ל',
    labelEn:
      "A dedicated Instagram/TikTok filter: creating a filter for the event with KKL elements (such as a kibbutz hat and Israeli landscapes), with a dedicated hashtag for the community and KKL",
  },
  {
    key: "young_planter_contest",
    label:
      'תחרות "הנוטע הצעיר": זריעת זרעים בתוך כוסות מתכלות ממותגות, עם הסבר על תהליך הייעור בישראל',
    labelEn:
      'A "young planter" contest: planting seeds in branded biodegradable cups, with an explanation of the afforestation process in Israel',
  },
  {
    key: "seed_postcard",
    label:
      'גלויה עם זרעים: חלוקת גלויה המציגה פרויקט של קק"ל, כאשר בתוך הנייר מוטמנים זרעי פרחי בר ישראליים שניתן לשתול בבית',
    labelEn:
      "A seed postcard: distributing a postcard showing a KKL project, with Israeli wildflower seeds embedded in the paper that can be planted at home",
  },
  {
    key: "post_event_social",
    label:
      'לאחר האירוע: בהעלאת פוסטים, תמונות וסיכומים ברשתות החברתיות - מיתוג והאשטאג לקק"ל',
    labelEn:
      "After the event: posting photos and summaries on social media - branding and a hashtag for KKL",
  },
  {
    key: "local_produce_market",
    label:
      'שוק "תוצרת הארץ": עמדה המעוצבת כשוק ישראלי המציעה טעימות של מוצרים שגדלים באזורים שקק"ל תומכת בהם (שמן זית, תמרים, יין מהנגב או מהגליל). ממותג קק"ל',
    labelEn:
      'A "produce of the land" market: a station designed as an Israeli market offering tastings of products grown in areas KKL supports (olive oil, dates, wine from the Negev or the Galilee). Branded with KKL',
  },
  {
    key: "juice_bar",
    label:
      'בר מיצים טבעיים "כחול-ירוק": הגשת שייקים או מיצים בצבעי המותג עם לוגו קק"ל, עם הסבר על חקלאות וחיסכון במים בישראל',
    labelEn:
      'A "blue-green" natural juice bar: serving shakes or juices in the brand\'s colors with the KKL logo, with an explanation about agriculture and water conservation in Israel',
  },
  {
    key: "food_branding",
    label:
      'מיתוג על גבי אוכל: שימוש בדגלונים קטנים של קק"ל על מגשי הכיבוד או "הטבעה" של הלוגו על פרוסות פרי/לחם (באמצעות חותמות מזון)',
    labelEn:
      'Branding on food: using small KKL flags on refreshment trays, or "stamping" the logo on fruit slices/bread (using food stamps)',
  },
  {
    key: "photo_frame",
    label: 'מסגרת מעוצבת קק"ל לצילום (צלמית מגנטים)',
    labelEn: "A designed KKL photo frame (magnet photo booth)",
  },
];
