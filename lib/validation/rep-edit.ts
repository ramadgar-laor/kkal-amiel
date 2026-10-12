import { z } from "zod";
import { COUNTRIES_EN } from "@/lib/data/countries";
import { PARTICIPATION_LEVELS } from "@/lib/validation/rep-registration";

const COUNTRY_CODES = new Set(COUNTRIES_EN.map((c) => c.code));

export const REP_STATUSES = ["pending", "approved", "rejected", "inactive"] as const;
export type RepStatus = (typeof REP_STATUSES)[number];

export const repEditSchema = z.object({
  firstNameHe: z.string().trim().min(1),
  lastNameHe: z.string().trim().min(1),
  firstNameLocal: z.string().trim().optional().or(z.literal("")),
  lastNameLocal: z.string().trim().optional().or(z.literal("")),
  whatsappPhone: z.string().trim().min(1),
  missionPhone: z.string().trim().optional().or(z.literal("")),
  dateOfBirth: z.string().trim().optional().or(z.literal("")),
  maritalStatus: z.string().trim().optional().or(z.literal("")),
  mailingInstitution: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  zip: z.string().trim().optional().or(z.literal("")),
  country: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || COUNTRY_CODES.has(v), { message: "invalid country" }),
  organization: z.string().trim().optional().or(z.literal("")),
  activityLevel: z.enum(PARTICIPATION_LEVELS).optional().or(z.literal("")),
  missionLocationName: z.string().trim().optional().or(z.literal("")),
  institutionType: z.string().trim().optional().or(z.literal("")),
  institutionCity: z.string().trim().optional().or(z.literal("")),
  mainRole: z.string().trim().optional().or(z.literal("")),
  missionStartDate: z.string().trim().optional().or(z.literal("")),
  missionEndDateExpected: z.string().trim().optional().or(z.literal("")),
  status: z.enum(REP_STATUSES),
  kkalNotes: z.string().trim().optional().or(z.literal("")),
  registrationNotes: z.string().trim().optional().or(z.literal("")),
});

export type RepEditInput = z.infer<typeof repEditSchema>;
