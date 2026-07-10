import {drizzle} from "drizzle-orm/postgres-js";
import {migrate} from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });

async function run() {
  await migrate(drizzle(migrationClient), {
    migrationsFolder: "./drizzle/migrations",
  });
  await migrationClient.end();
}

run().catch(console.error);
