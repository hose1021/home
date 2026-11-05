import "dotenv/config";
import {db} from "@/core/db";
import {tenants} from "@/core/db/schema";
import {reallocateTenantPayments} from "@/modules/finance/services/allocation.service";

/** One-off: rebuild payment_allocations for every tenant from confirmed payments. Idempotent. */
async function main() {
    const rows = await db.select({id: tenants.id, name: tenants.name}).from(tenants);
    for (const tenant of rows) {
        const count = await reallocateTenantPayments(tenant.id);
        console.log(`${tenant.name}: allocated ${count} payments`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
        console.error(error);
        process.exit(1);
    });
