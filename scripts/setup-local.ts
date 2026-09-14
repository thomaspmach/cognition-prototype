import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

if (!existsSync(".env")) {
  writeFileSync(".env", [
    `BETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}`,
    "BETTER_AUTH_URL=http://localhost:3000",
    "SQLITE_PATH=.data/workspace.sqlite",
    "",
  ].join("\n"), { mode: 0o600, flag: "wx" });
  console.log("Created local .env with a generated session secret.");
} else {
  console.log("Preserved existing .env.");
}
