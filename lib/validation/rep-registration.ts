import { z } from "zod";
import { COUNTRIES_EN } from "@/lib/data/countries";
import {
  SENDING_ORGANIZATIONS,
  INSTITUTION_TYPES,
  OTHER_OPTION,
} from "@/lib/data/kkal-reps-options";

export const PARTICIPATION_LEVELS = ["trustee", "fellow", "coordinator"] as const;
export type ParticipationLevel = (typeof PARTICIPATION_LEVELS)[number];

// Matches the real form's "מצב משפחתי" radio: רווק.ה / נשוי.ה / נשוי.ה+ילדים
// / אלמן.ה-גרוש.ה / Other.
export const MARITAL_STATUSES = [
  "single",
  "married",
  "married_with_children",
  "widowed_divorced",
  "other",
] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

const COUNTRY_CODES = new Set(COUNTRIES_EN.map((c) => c.code));
const ORG_VALUES = new Set<string>([...SENDING_ORGANIZATIONS, OTHER_OPTION]);
const INSTITUTION_TYPE_VALUES = new Set<string>([
  ...INSTITUTION_TYPES,
  OTHER_OPTION,
]);

export const repRegistrationSchema = z
  .object({
    email: z.string().trim().email(),
    firstNameHe: z.string().trim().min(1),
    lastNameHe: z.string().trim().min(1),
    firstNameLocal: z.string().trim().min(1),
    lastNameLocal: z.string().trim().min(1),
    whatsappPhone: z.string().trim().min(5),
    missionPhone: z.string().trim().optional().or(z.literal("")),
    dateOfBirth: z.string().trim().min(1),
    maritalStatus: z.enum(MARITAL_STATUSES).optional().or(z.literal("")),
    maritalStatusOther: z.string().trim().optional().or(z.literal("")),
    mailingInstitution: z.string().trim().min(1),
    address: z.string().trim().optional().or(z.literal("")),
    city: z.string().trim().min(1),
    state: z.string().trim().optional().or(z.literal("")),
    zip: z.string().trim().optional().or(z.literal("")),
    country: z.string().trim().refine((v) => COUNTRY_CODES.has(v), {
      message: "invalid country",
    }),
    organization: z.string().trim().refine((v) => ORG_VALUES.has(v), {
      message: "required",
    }),
    organizationOther: z.string().trim().optional().or(z.literal("")),
    missionLocationName: z.string().trim().min(1),
    institutionType: z
      .string()
      .trim()
      .refine((v) => INSTITUTION_TYPE_VALUES.has(v), { message: "required" }),
    institutionTypeOther: z.string().trim().optional().or(z.literal("")),
    institutionCity: z.string().trim().min(1),
    mainRole: z.string().trim().min(1),
    // Intentionally optional, matching the real form — the expected end
    // date is explicitly noted there as approximate and subject to later
    // confirmation, so a rep who doesn't know it yet should never be forced
    // to fabricate one.
    missionStartDate: z.string().trim().optional().or(z.literal("")),
    missionEndDateExpected: z.string().trim().optional().or(z.literal("")),
    participationLevel: z.enum(PARTICIPATION_LEVELS),
    registrationNotes: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (values.organization === OTHER_OPTION && !values.organizationOther) {
      ctx.addIssue({
        code: "custom",
        path: ["organizationOther"],
        message: "required",
      });
    }
    if (
      values.institutionType === OTHER_OPTION &&
      !values.institutionTypeOther
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["institutionTypeOther"],
        message: "required",
      });
    }
    if (values.maritalStatus === "other" && !values.maritalStatusOther) {
      ctx.addIssue({
        code: "custom",
        path: ["maritalStatusOther"],
        message: "required",
      });
    }
  });

export type RepRegistrationInput = z.infer<typeof repRegistrationSchema>;
