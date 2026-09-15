import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor, RequestError } from "./access";
import { reportServerError } from "./diagnostics";

export async function requirePageActor() {
  return requireActor(await headers()).catch((error: unknown) => {
    if (error instanceof RequestError && error.status === 401) redirect("/login");
    if (error instanceof RequestError && error.status < 500) throw error;
    const errorId = reportServerError(error, "workspace.session.read");
    throw new Error(`Workspace access could not be verified. Reference: ${errorId}`);
  });
}
