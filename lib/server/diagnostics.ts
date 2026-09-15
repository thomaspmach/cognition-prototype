import "server-only";
import { randomUUID } from "node:crypto";

export type ServerOperation = "kyc.queue.read" | "kyc.case.read" | "kyc.case.write" | "workspace.session.read";

const errorTypes = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "SqliteError", "APIError"]);
const databaseCodes = new Set([
  "SQLITE_ERROR", "SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_READONLY", "SQLITE_IOERR",
  "SQLITE_CORRUPT", "SQLITE_FULL", "SQLITE_CANTOPEN", "SQLITE_CONSTRAINT",
  "SQLITE_CONSTRAINT_TRIGGER", "SQLITE_CONSTRAINT_FOREIGNKEY", "SQLITE_CONSTRAINT_UNIQUE",
]);

export function reportServerError(error: unknown, operation: ServerOperation) {
  const errorId = randomUUID();
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  console.error(JSON.stringify({
    event: "unexpected_server_error", errorId, operation,
    errorType: error instanceof Error && errorTypes.has(error.name) ? error.name : "UnknownError",
    databaseCode: typeof code === "string" && databaseCodes.has(code) ? code : undefined,
  }));
  return errorId;
}
