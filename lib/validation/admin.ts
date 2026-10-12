import { z } from "zod";

export const ROLES = ["rep", "kkal", "amiel", "admin"] as const;
export type AppRole = (typeof ROLES)[number];

// Reps now self-register via the public form + magic-link sign-in, which is
// the only path that collects their full profile (name, phone, mission
// details, etc.) — see lib/validation/rep-registration.ts. The admin
// quick-create tool only ever collects email/password/display_name, so it is
// restricted to staff roles to avoid creating "rep" accounts with no
// underlying registration data.
export const STAFF_ROLES = ["kkal", "amiel", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(STAFF_ROLES),
  displayName: z.string().trim().optional().or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const changeRoleSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(ROLES),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
