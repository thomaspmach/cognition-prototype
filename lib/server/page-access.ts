import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor, RequestError } from "./access";

export async function requirePageActor() {
  return requireActor(await headers()).catch((error: unknown) => {
    if (error instanceof RequestError && error.status === 401) redirect("/login");
    throw error;
  });
}
