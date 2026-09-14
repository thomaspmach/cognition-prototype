import "server-only";
import { ZodError } from "zod";
import { RequestError } from "./access";

export function errorResponse(error: unknown) {
  if (error instanceof RequestError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return Response.json({ error: "Provide a valid JSON request." }, { status: 400 });
  }
  return Response.json({ error: "The request could not be completed. Please retry." }, { status: 500 });
}
