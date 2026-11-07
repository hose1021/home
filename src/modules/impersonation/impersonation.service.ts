import {and, eq} from "drizzle-orm";
import {db} from "@/core/db";
import {users} from "@/core/db/schema/users";

export type ViewAsTarget = {id: string; fullName: string; username: string};

export async function listViewAsTargets(tenantId: string): Promise<ViewAsTarget[]> {
  return db
    .select({id: users.id, fullName: users.fullName, username: users.username})
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .orderBy(users.fullName)
    .limit(500);
}

export async function isActiveTenantUser(tenantId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({id: users.id})
    .from(users)
    .where(and(
      eq(users.id, userId),
      eq(users.tenantId, tenantId),
      eq(users.isActive, true),
    ))
    .limit(1);
  return Boolean(row);
}
