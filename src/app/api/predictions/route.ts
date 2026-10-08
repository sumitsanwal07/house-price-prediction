import { clearPredictions, deletePrediction, listPredictions } from "@/lib/housing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 25;
  try {
    const rows = await listPredictions(limit);
    return Response.json({ ok: true, predictions: rows });
  } catch (error) {
    console.error("history failed", error);
    return Response.json({ ok: false, error: "History unavailable" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  try {
    if (Number.isFinite(id) && id > 0) {
      const removed = await deletePrediction(id);
      return Response.json({ ok: removed, deleted: removed ? 1 : 0 });
    }
    const removed = await clearPredictions();
    return Response.json({ ok: true, deleted: removed });
  } catch (error) {
    console.error("delete failed", error);
    return Response.json({ ok: false, error: "Delete failed" }, { status: 500 });
  }
}
