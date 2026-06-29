import { runPipeline } from "@eventi/sources";
import { NextResponse } from "next/server";
import { buildGeoQuery, isValidLatLng } from "@/lib/query";

// pipeline usa fs (cache) + eventualmente playwright: runtime Node, no edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events?lat=&lng=&radius=&from=&to=&city=
 * Ritorna Event[] gia' rankati e filtrati (filtro adattivo applicato).
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const query = buildGeoQuery(searchParams);

  if (!isValidLatLng(query)) {
    return NextResponse.json(
      { error: "Parametri lat/lng mancanti o non validi" },
      { status: 400 },
    );
  }

  try {
    const result = await runPipeline(query);
    return NextResponse.json({
      query,
      meta: {
        rawCount: result.rawCount,
        dedupedCount: result.dedupedCount,
        finalCount: result.events.length,
        sources: result.sources,
        failed: result.failed,
        usedMock: result.usedMock,
      },
      events: result.events,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Errore pipeline", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
