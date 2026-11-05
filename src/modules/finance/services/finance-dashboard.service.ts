import {and, eq} from "drizzle-orm";
import {db} from "@/core/db";
import {owners, ownerships} from "@/core/db/schema/owners";
import {units} from "@/core/db/schema/units";

export type DashboardUnit = {
  id: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  ownerName: string | null;
  ownerId: string | null;
};

/** Active units with their primary owner, for payment forms. */
export async function listUnitsWithOwners(tenantId: string): Promise<Array<DashboardUnit & {ownerId: string}>> {
  const rows = await db
    .select({
      id: units.id,
      unitNumber: units.unitNumber,
      entrance: units.entrance,
      floor: units.floor,
      ownerName: owners.fullName,
      ownerId: owners.id,
    })
    .from(units)
    .leftJoin(ownerships, and(eq(ownerships.unitId, units.id), eq(ownerships.tenantId, tenantId), eq(ownerships.isPrimary, true)))
    .leftJoin(owners, and(eq(owners.id, ownerships.ownerId), eq(owners.tenantId, tenantId)))
    .where(and(eq(units.tenantId, tenantId), eq(units.status, "active")))
    .orderBy(units.entrance, units.floor, units.unitNumber);

  return rows.filter((unit): unit is DashboardUnit & {ownerId: string} => unit.ownerId !== null);
}
