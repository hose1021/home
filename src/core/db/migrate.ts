import "dotenv/config";
import {drizzle} from "drizzle-orm/postgres-js";
import {migrate} from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });

async function run() {
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: "./drizzle/migrations",
    });
  } finally {
    await migrationClient.end();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
