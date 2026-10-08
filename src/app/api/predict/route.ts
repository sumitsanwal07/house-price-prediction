import { predictHouse } from "@/lib/housing";
import { sanitizeInput } from "@/lib/ml/features";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { input, errors } = sanitizeInput(body);
    if (errors.length) {
      return Response.json({ ok: false, errors }, { status: 400 });
    }
    const result = await predictHouse(input, { persist: body.persist !== false });
    return Response.json({ ok: true, input, result });
  } catch (error) {
    console.error("predict failed", error);
    return Response.json({ ok: false, errors: ["Prediction failed"] }, { status: 500 });
  }
}
