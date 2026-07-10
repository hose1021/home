import {drizzle} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const globalForDb = globalThis as unknown as { client: postgres.Sql | undefined };

const client = globalForDb.client ?? postgres(process.env.DATABASE_URL!);
if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
export { schema };
