import { db, sqlite } from "../lib/server/database";
import { seed } from "../lib/server/seed";

await seed(db);
sqlite.close();
console.log("Synthetic seed complete; existing accounts, cases and history preserved.");
