import {decimal, index, pgTable, timestamp, unique, uuid} from "drizzle-orm/pg-core";
import {charges} from "./charges";
import {payments} from "./payments";
import {tenants} from "./tenants";

/** Money from one payment applied to one charge. A payment can span several charges; the rest stays an advance. */
export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  paymentId: uuid("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  chargeId: uuid("charge_id").notNull().references(() => charges.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  paymentChargeUnique: unique("uq_payment_allocations_payment_charge").on(table.paymentId, table.chargeId),
  chargeIdx: index("ix_payment_allocations_tenant_charge").on(table.tenantId, table.chargeId),
  paymentIdx: index("ix_payment_allocations_tenant_payment").on(table.tenantId, table.paymentId),
}));
