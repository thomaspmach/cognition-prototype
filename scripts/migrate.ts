import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "../lib/server/database";

migrate(db, { migrationsFolder: "./drizzle" });
sqlite.close();
console.log("Database migrations applied.");
