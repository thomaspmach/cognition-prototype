import { errorResponse } from "@/lib/server/http";
import { listCases } from "@/lib/server/kyc";

export async function GET(request: Request) {
  try {
    const query = Object.fromEntries(new URL(request.url).searchParams);
    return Response.json(await listCases(request.headers, query), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error, "kyc.queue.read");
  }
}
