import {z} from "zod";

export const createTenantSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  name: z.string().min(2).max(255),
  taxId: z.string().max(20).optional(),
  address: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
});

export const updateTenantSchema = createTenantSchema.partial().extend({
  status: z.enum(["active", "suspended", "archived"]).optional(),
});
