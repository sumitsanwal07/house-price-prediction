import { ensureModel, retrainModel } from "@/lib/housing";
import { TrainingDivergedError } from "@/lib/ml/regression";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const model = await ensureModel();
    return Response.json({ ok: true, model });
  } catch (error) {
    console.error("model load failed", error);
    return Response.json({ ok: false, error: "Model unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const epochs = Number(body.epochs);
    const learningRate = Number(body.learningRate);
    const l2 = Number(body.l2);

    const model = await retrainModel({
      epochs: Number.isFinite(epochs) ? epochs : undefined,
      learningRate: Number.isFinite(learningRate) ? learningRate : undefined,
      l2: Number.isFinite(l2) ? l2 : undefined,
    });

    return Response.json({ ok: true, model });
  } catch (error) {
    if (error instanceof TrainingDivergedError) {
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }
    console.error("training failed", error);
    return Response.json({ ok: false, error: "Training failed" }, { status: 500 });
  }
}
