import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./database";
import { user } from "./schema";

export class RequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireActor(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new RequestError(401, "Sign in to access the workspace.");
  const actor = db.select({ id: user.id, name: user.name, role: user.role })
    .from(user).where(eq(user.id, session.user.id)).get();
  if (!actor) throw new RequestError(401, "Sign in to access the workspace.");
  if (actor.role !== "viewer" && actor.role !== "reviewer") {
    throw new RequestError(403, "You do not have workspace access.");
  }
  return actor;
}

export async function requireReviewer(headers: Headers) {
  const actor = await requireActor(headers);
  if (actor.role !== "reviewer") throw new RequestError(403, "Only Reviewers can change cases.");
  return actor;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  if (!origin || origin !== expected) {
    throw new RequestError(403, "This request must originate from the workspace.");
  }
}
