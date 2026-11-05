import {decimal, index, pgTable, text, timestamp, uuid, varchar} from "drizzle-orm/pg-core";
import {charges} from "./charges";
import {tenants} from "./tenants";
import {users} from "./users";

/**
 * A manual correction to one charge: `credit` lowers what the owner owes (discount, write-off),
 * `debit` raises it (penalty, recalculation). Kept separate from the charge amount for auditability.
 */
export const adjustments = pgTable("adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  chargeId: uuid("charge_id").notNull().references(() => charges.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 10 }).notNull().$type<"credit" | "debit">(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  chargeIdx: index("ix_adjustments_tenant_charge").on(table.tenantId, table.chargeId),
}));
