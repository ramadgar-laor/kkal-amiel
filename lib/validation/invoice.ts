import { z } from "zod";

// Invoice intake, submitted by a rep against one of their own approved (or
// partially-approved) events. Mirrors the `invoices` table columns 1:1.
// Bank details here are *required* (unlike the event-creation form's
// suppliers, where they're optional and deferred) — this is exactly the
// point in the process where they're needed, since this is what actually
// drives payment. See lib/validation/event.ts's supplierSchema comment for
// the deferred side of this design.
// The 2 currencies Amiel can actually pay a supplier in (item 4 of the
// invoice-overhaul request) -- distinct from the original invoice currency
// below, which stays free text since a supplier can invoice in anything.
export const PAYMENT_AMOUNT_CURRENCIES = ["USD", "EUR"] as const;
export type PaymentAmountCurrency = (typeof PAYMENT_AMOUNT_CURRENCIES)[number];

export const invoiceSchema = z.object({
  eventId: z.string().trim().min(1),

  supplierName: z.string().trim().min(1),
  supplierField: z.string().trim().optional().or(z.literal("")),
  supplierBankName: z.string().trim().min(1),
  supplierBankAddress: z.string().trim().min(1),
  supplierBankCountry: z.string().trim().min(1),
  supplierIban: z.string().trim().min(1),
  supplierSwift: z.string().trim().min(1),
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

  // Original invoice amount, in whatever currency the supplier billed in.
  amount: z.coerce.number().positive(),
  currency: z.string().trim().min(1),
  // What Amiel will actually transfer to the supplier -- restricted to the
  // 2 currencies Amiel pays in.
  paymentAmount: z.coerce.number().positive(),
  paymentAmountCurrency: z.enum(PAYMENT_AMOUNT_CURRENCIES),
  // The invoice amount in ILS, so kkal/Amiel can track it against the
  // event's approved ILS budget (item 5).
  ilsAmount: z.coerce.number().positive(),
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
    supplierBankAddress: z.string().trim().min(1),
    supplierBankCountry: z.string().trim().min(1),
    supplierIban: z.string().trim().min(1),
    supplierSwift: z.string().trim().min(1),
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
    paymentAmount: z
      .string()
      .trim()
      .min(1)
      .refine((v) => Number(v) > 0, { message: "must_be_positive" }),
    paymentAmountCurrency: z.enum(PAYMENT_AMOUNT_CURRENCIES),
    ilsAmount: z
      .string()
      .trim()
      .min(1)
      .refine((v) => Number(v) > 0, { message: "must_be_positive" }),
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
