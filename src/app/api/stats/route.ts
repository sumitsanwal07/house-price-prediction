import { getDatasetStats } from "@/lib/housing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getDatasetStats();
    return Response.json({ ok: true, stats });
  } catch (error) {
    console.error("stats failed", error);
    return Response.json({ ok: false, error: "Stats unavailable" }, { status: 500 });
  }
}
