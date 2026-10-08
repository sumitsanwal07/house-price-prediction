import { listHouses } from "@/lib/housing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const numberParam = (key: string) => {
    const raw = url.searchParams.get(key);
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  try {
    const data = await listHouses({
      city: url.searchParams.get("city") ?? undefined,
      neighborhood: url.searchParams.get("neighborhood") ?? undefined,
      bedrooms: numberParam("bedrooms"),
      minPrice: numberParam("minPrice"),
      maxPrice: numberParam("maxPrice"),
      page: numberParam("page"),
      pageSize: numberParam("pageSize"),
    });
    return Response.json({ ok: true, ...data });
  } catch (error) {
    console.error("houses query failed", error);
    return Response.json({ ok: false, error: "Query failed" }, { status: 500 });
  }
}
