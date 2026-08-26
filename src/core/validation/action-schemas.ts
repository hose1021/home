import {z} from "zod";

export const uuidSchema = z.string().uuid();
export const moneySchema = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Invalid monetary amount");
export const usernameSchema = z.string().trim().min(1).max(100);
export const shortText = (max: number) => z.string().trim().min(1).max(max);

export const unitInputSchema = z.object({
  unitNumber: shortText(50),
  entrance: z.number().int().min(1).max(100),
  floor: z.number().int().min(-5).max(200),
  type: z.enum(["residential", "commercial", "parking", "storage", "other"]),
  area: moneySchema,
});

export const ownerCreateSchema = z.object({
  fullName: shortText(255),
  phone: z.string().trim().max(50).optional(),
  username: usernameSchema,
  password: z.string().min(12).max(128),
  ...unitInputSchema.shape,
});

export const ownerUpdateSchema = z.object({
  fullName: shortText(255).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  username: usernameSchema.optional(),
  roles: z.array(z.enum(["admin", "management_member", "commandant", "owner"])).max(4).optional(),
});

export const paymentInputSchema = z.object({
  chargeId: uuidSchema.optional(),
  unitId: uuidSchema,
  ownerId: uuidSchema,
  amount: moneySchema,
  periodYear: z.number().int().min(2000).max(2200),
  periodMonth: z.number().int().min(1).max(12),
  paymentMethod: z.enum(["cash", "bank_transfer", "card", "e_manat", "pos_terminal"]),
  referenceNo: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  tariffPerSqm: moneySchema.optional(),
});

export const budgetYearSchema = z.number().int().min(2000).max(2200);
export const budgetItemSchema = z.object({
  accountCode: z.string().trim().regex(/^\d{4}$/),
  plannedAmount: moneySchema,
  notes: z.string().trim().max(2000).optional(),
});
export const budgetItemUpdateSchema = budgetItemSchema.partial().extend({
  actualAmount: moneySchema.optional(),
});
