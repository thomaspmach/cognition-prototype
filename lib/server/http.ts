import "server-only";
import { ZodError } from "zod";
import { RequestError } from "./access";
import { reportServerError, type ServerOperation } from "./diagnostics";

export function errorResponse(error: unknown, operation: ServerOperation) {
  if (error instanceof RequestError && error.status < 500) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return Response.json({ error: "Provide a valid JSON request." }, { status: 400 });
  }
  const errorId = reportServerError(error, operation);
  return Response.json({
    error: `The request could not be completed. Please retry. Reference: ${errorId}`, errorId,
  }, { status: 500, headers: { "Cache-Control": "no-store", "X-Request-ID": errorId } });
}
