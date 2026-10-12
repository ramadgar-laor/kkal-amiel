import { z } from "zod";

// Invoice intake, submitted by a rep against one of their own approved (or
// partially-approved) events. Mirrors the `invoices` table columns 1:1.
// Bank details here are *required* (unlike the event-creation form's
// suppliers, where they're optional and deferred) — this is exactly the
// point in the process where they're needed, since this is what actually
// drives payment. See lib/validation/event.ts's supplierSchema comment for
// the deferred side of this design.
export const invoiceSchema = z.object({
  eventId: z.string().trim().min(1),

  supplierName: z.string().trim().min(1),
  supplierField: z.string().trim().optional().or(z.literal("")),
  supplierBankName: z.string().trim().min(1),
  supplierIban: z.string().trim().min(1),
  supplierSwift: z.string().trim().optional().or(z.literal("")),
  supplierBeneficiaryName: z.string().trim().min(1),
  supplierContactPhone: z.string().trim().optional().or(z.literal("")),
  supplierContactEmail: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "invalid_email",
    }),

  amount: z.coerce.number().positive(),
  currency: z.string().trim().min(1),
  invoiceDate: z.string().trim().min(1),

  filePath: z.string().trim().min(1),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// Client-facing form schema: identical shape, except amount is a string
// (as typed into a controlled input) and filePath is a real File (or null)
// since nothing has been uploaded yet at the point the form validates. The
// component swaps File -> storage path and calls `invoiceSchema` (via the
// submitInvoice server action) on actual submit.
export const invoiceFormSchema = z
  .object({
    eventId: z.string().trim().min(1),

    supplierName: z.string().trim().min(1),
    supplierField: z.string().trim().optional().or(z.literal("")),
    supplierBankName: z.string().trim().min(1),
    supplierIban: z.string().trim().min(1),
    supplierSwift: z.string().trim().optional().or(z.literal("")),
    supplierBeneficiaryName: z.string().trim().min(1),
    supplierContactPhone: z.string().trim().optional().or(z.literal("")),
    supplierContactEmail: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || z.string().email().safeParse(v).success, {
        message: "invalid_email",
      }),

    amount: z
      .string()
      .trim()
      .min(1)
      .refine((v) => Number(v) > 0, { message: "must_be_positive" }),
    currency: z.string().trim().min(1),
    invoiceDate: z.string().trim().min(1),

    file: z.instanceof(File).nullable(),
  })
  .superRefine((v, ctx) => {
    if (!v.file) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["file"],
        message: "required",
      });
    }
  });

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
