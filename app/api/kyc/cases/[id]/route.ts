import { requireReviewer, requireSameOrigin } from "@/lib/server/access";
import { errorResponse } from "@/lib/server/http";
import { getCase, mutateCase } from "@/lib/server/kyc";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return Response.json(await getCase(request.headers, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error, "kyc.case.read");
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await requireReviewer(request.headers);
    requireSameOrigin(request);
    const { id } = await context.params;
    return Response.json(await mutateCase(request.headers, id, await request.json()));
  } catch (error) {
    return errorResponse(error, "kyc.case.write");
  }
}
