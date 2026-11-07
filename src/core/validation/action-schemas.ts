import {z} from "zod";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/core/auth/constants";
import {BILLING, PAYMENT_METHODS, ROLES, UNIT_TYPES} from "@/core/db/schema/enums";

export const uuidSchema = z.string().uuid();
export const moneySchema = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Invalid monetary amount");
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH)
  .regex(USERNAME_PATTERN);

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export const periodSchema = z.object({
  periodYear: z.number().int().min(BILLING.minYear).max(BILLING.maxYear),
  periodMonth: z.number().int().min(BILLING.minMonth).max(BILLING.maxMonth),
});

export const unitInputSchema = z.object({
  unitNumber: z.string().trim().min(1).max(50),
  entrance: z.number().int().min(1).max(100),
  floor: z.number().int().min(-5).max(200),
  type: z.enum(UNIT_TYPES),
  area: moneySchema,
});

export const ownerCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(50).optional(),
  username: usernameSchema,
  password: passwordSchema,
  ...unitInputSchema.shape,
});

export const ownerUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  username: usernameSchema.optional(),
  roles: z.array(z.enum(ROLES)).max(ROLES.length).optional(),
});

export const paymentInputSchema = z.object({
  chargeId: uuidSchema.optional(),
  unitId: uuidSchema,
  ownerId: uuidSchema,
  amount: moneySchema,
  periodYear: periodSchema.shape.periodYear,
  periodMonth: periodSchema.shape.periodMonth,
  paymentMethod: z.enum(PAYMENT_METHODS),
  referenceNo: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  tariffPerSqm: moneySchema.optional(),
});
