import { z } from "zod";
import {
  repRegistrationBase,
  refineRepCrossFields,
} from "@/lib/validation/rep-registration";

// What an ambassador may change about themselves from /profile: every
// registration field that can change over time. Left out on purpose:
// email (sign-in identity), date of birth (doesn't change), participation
// level (a program level KKL approves), and the one-off registration notes.
export const repProfileSchema = repRegistrationBase
  .omit({
    email: true,
    dateOfBirth: true,
    participationLevel: true,
    registrationNotes: true,
  })
  .superRefine(refineRepCrossFields);

export type RepProfileInput = z.infer<typeof repProfileSchema>;
