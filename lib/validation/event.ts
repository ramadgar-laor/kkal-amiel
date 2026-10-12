import { z } from "zod";
import { KKAL_PRESENCE_MIN_SELECTIONS } from "@/lib/data/kkal-presence";

export const EVENT_TRACKS = ["one_time", "ongoing"] as const;

const yesNo = z.enum(["yes", "no"]);
// The 6 legal/process declarations ("אני מבין כי...", "אני מתחייב כי...")
// are statements of agreement — answering "לא" means the applicant does not
// consent, so (per the real form's intent) only "yes" lets the request go
// through.
// Explicit `: boolean` return annotation matters here: without it, TS 5.5+
// infers `(v) => v === "yes"` as a type-guard predicate and narrows zod's
// output type for this field down to the literal "yes" (dropping "no"),
// which then makes eventFormSchema's inferred type incompatible with
// react-hook-form's Resolver<T> generic ("two different types with this
// name exist" — a confusing symptom of that narrowing, not an actual
// duplicate-package issue).
const mustAgree = yesNo.refine((v): boolean => v === "yes", {
  message: "must_agree",
});

// A single line in the budget breakdown. Replaces the old "download an
// Excel template, fill it in, upload it back" field — these are exactly
// the columns the real template asked for (מהות ההוצאה / סכום במטבע מקומי
// / שער המרה). "סכום בשקלים" is computed server-side from the other two
// rather than typed or trusted from the client.
const budgetItemSchema = z.object({
  description: z.string().trim().min(1),
  localAmount: z.coerce.number().positive(),
  currency: z.string().trim().min(1),
  exchangeRate: z.coerce.number().positive(),
});
const budgetItemFormSchema = z.object({
  description: z.string().trim().min(1),
  localAmount: z
    .string()
    .trim()
    .min(1)
    .refine((v) => Number(v) > 0, { message: "must_be_positive" }),
  currency: z.string().trim().min(1),
  exchangeRate: z
    .string()
    .trim()
    .min(1)
    .refine((v) => Number(v) > 0, { message: "must_be_positive" }),
});

// A local supplier for the event. An event can have more than one. Bank
// details are only required when the rep actually has them yet
// (bankDetailsKnown === "yes") — at submission time they may not, and
// forcing placeholder data in would just create false information. The
// real details are required later, when invoices are entered (that's the
// step that actually drives payment).
const bankKnown = z.enum(["yes", "no"]);

const supplierSchema = z
  .object({
    name: z.string().trim().min(1),
    field: z.string().trim().min(1),
    bankDetailsKnown: bankKnown,
    beneficiaryName: z.string().trim().optional().or(z.literal("")),
    beneficiaryAddress: z.string().trim().optional().or(z.literal("")),
    bankName: z.string().trim().optional().or(z.literal("")),
    bankAddress: z.string().trim().optional().or(z.literal("")),
    accountNumber: z.string().trim().optional().or(z.literal("")),
    achRoutingNumber: z.string().trim().optional().or(z.literal("")),
    swiftNumber: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.bankDetailsKnown !== "yes") return;
    (
      [
        "beneficiaryName",
        "beneficiaryAddress",
        "bankName",
        "bankAddress",
        "accountNumber",
        "swiftNumber",
      ] as const
    ).forEach((field) => {
      if (!v[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "required",
        });
      }
    });
  });

// A single competing price quote: a file plus the local supplier contact's
// phone/email. Quote 1 is mandatory (per the real form); quotes 2 and 3 are
// optional extra slots for when there is more than one competing supplier.
const quoteSchema = z.object({
  filePath: z.string().trim().min(1),
  contactPhone: z.string().trim().min(1),
  contactEmail: z.string().trim().email(),
});
const optionalQuoteSchema = z.object({
  filePath: z.string().trim().optional().or(z.literal("")),
  contactPhone: z.string().trim().optional().or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "invalid_email",
    }),
});

function endNotBeforeStart<
  T extends { startDate: string; endDate: string },
>(v: T, ctx: z.RefinementCtx) {
  if (v.endDate && v.startDate && new Date(v.endDate) < new Date(v.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "end_before_start",
    });
  }
}

// Server-side schema: run against the payload the client sends *after* it
// has already uploaded every file to Supabase Storage and swapped the File
// objects for their storage paths. Mirrors every question in the real KKL
// event-budget-request Google Form (see lib/data/kkal-presence.ts for the
// visibility checklist and the new-event-form component for field-by-field
// provenance).
export const eventSchema = z
  .object({
    // Ambassador / affiliation confirmation questions.
    orgAffiliation: z.string().trim().min(1),
    registeredToProgram: yesNo,
    inWhatsappGroup: yesNo,

    // Event basics.
    name: z.string().trim().min(1),
    startDate: z.string().trim().min(1),
    endDate: z.string().trim().min(1),
    city: z.string().trim().optional().or(z.literal("")),
    country: z.string().trim().min(1),

    // Host organization / community running the event.
    hostOrgName: z.string().trim().min(1),
    hostManagerName: z.string().trim().min(1),
    hostManagerPhone: z.string().trim().min(1),
    hostManagerEmail: z.string().trim().email(),

    targetAudience: z.string().trim().min(1),
    participantsCount: z.coerce.number().int().positive(),
    programDescription: z.string().trim().min(1),

    track: z.enum(EVENT_TRACKS),
    ongoingProgramFilePath: z.string().trim().optional().or(z.literal("")),

    requestedAmount: z.coerce.number().positive(),
    transferAmountNote: z.string().trim().min(1),

    budgetItems: z
      .array(budgetItemSchema)
      .min(1, { message: "required_at_least_one" }),

    suppliers: z
      .array(supplierSchema)
      .min(1, { message: "required_at_least_one" }),

    quote1: quoteSchema,
    quote2: optionalQuoteSchema,
    quote3: optionalQuoteSchema,

    kkalPresenceSelections: z
      .array(z.string())
      .min(KKAL_PRESENCE_MIN_SELECTIONS, { message: "min_selections" }),

    consentNoCommitment: mustAgree,
    consentCommitteeReview: mustAgree,
    consentFollowBranding: mustAgree,
    consentExchangeRate: mustAgree,
    consentBankFees: mustAgree,
    consentFollowupPhotos: mustAgree,

    notes: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.track === "ongoing" && !v.ongoingProgramFilePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ongoingProgramFilePath"],
        message: "required_for_ongoing_track",
      });
    }
    endNotBeforeStart(v, ctx);
  });

export type EventInput = z.infer<typeof eventSchema>;

// Client-facing form schema: identical shape, except file fields are real
// File objects (or null) since nothing has been uploaded yet at the point
// the form validates. The component swaps File -> storage path and calls
// `eventSchema` (via the createEvent server action) on actual submit.
const optionalFile = z.instanceof(File).optional().nullable();

const quoteFormSchema = z.object({
  file: z.instanceof(File).nullable(),
  contactPhone: z.string().trim().min(1),
  contactEmail: z.string().trim().email(),
});
const optionalQuoteFormSchema = z.object({
  file: optionalFile,
  contactPhone: z.string().trim().optional().or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "invalid_email",
    }),
});

export const eventFormSchema = z
  .object({
    orgAffiliation: z.string().trim().min(1),
    registeredToProgram: yesNo,
    inWhatsappGroup: yesNo,

    name: z.string().trim().min(1),
    startDate: z.string().trim().min(1),
    endDate: z.string().trim().min(1),
    city: z.string().trim().optional().or(z.literal("")),
    country: z.string().trim().min(1),

    hostOrgName: z.string().trim().min(1),
    hostManagerName: z.string().trim().min(1),
    hostManagerPhone: z.string().trim().min(1),
    hostManagerEmail: z.string().trim().email(),

    targetAudience: z.string().trim().min(1),
    participantsCount: z
      .string()
      .trim()
      .min(1)
      .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, {
        message: "must_be_positive_integer",
      }),
    programDescription: z.string().trim().min(1),

    track: z.enum(EVENT_TRACKS),
    ongoingProgramFile: optionalFile,

    requestedAmount: z
      .string()
      .trim()
      .min(1)
      .refine((v) => Number(v) > 0, { message: "must_be_positive" }),
    transferAmountNote: z.string().trim().min(1),

    budgetItems: z
      .array(budgetItemFormSchema)
      .min(1, { message: "required_at_least_one" }),

    suppliers: z
      .array(supplierSchema)
      .min(1, { message: "required_at_least_one" }),

    quote1: quoteFormSchema,
    quote2: optionalQuoteFormSchema,
    quote3: optionalQuoteFormSchema,

    kkalPresenceSelections: z
      .array(z.string())
      .min(KKAL_PRESENCE_MIN_SELECTIONS, { message: "min_selections" }),

    consentNoCommitment: mustAgree,
    consentCommitteeReview: mustAgree,
    consentFollowBranding: mustAgree,
    consentExchangeRate: mustAgree,
    consentBankFees: mustAgree,
    consentFollowupPhotos: mustAgree,

    notes: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.track === "ongoing" && !v.ongoingProgramFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ongoingProgramFile"],
        message: "required_for_ongoing_track",
      });
    }
    if (!v.quote1.file) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quote1", "file"],
        message: "required",
      });
    }
    endNotBeforeStart(v, ctx);
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
