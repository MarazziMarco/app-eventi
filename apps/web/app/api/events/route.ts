import { runPipeline } from "@eventi/sources";
import { NextResponse } from "next/server";
import { buildGeoQuery, isValidLatLng } from "@/lib/query";
import { corsHeaders } from "@/lib/cors";

// In build Capacitor (export statico) la route viene prerenderizzata vuota:
// l'app usa l'API remota su Vercel, non quella nel bundle.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

export const runtime = "nodejs";
// force-dynamic always: in Capacitor build GET returns EMPTY early,
// so no real pipeline work is done, but the export must be a string literal.
export const dynamic = "force-dynamic";

const EMPTY = {
  query: null,
  meta: { rawCount: 0, dedupedCount: 0, finalCount: 0, sources: [], failed: [], usedMock: false },
  events: [],
};

/** Preflight CORS per l'app mobile. */
export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET /api/events?lat=&lng=&radius=&from=&to=&city=
 * Ritorna Event[] gia' rankati e filtrati (filtro adattivo applicato).
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (isCapacitorBuild) {
    return NextResponse.json(EMPTY, { headers: corsHeaders() });
  }

  const { searchParams } = new URL(req.url);
  const query = buildGeoQuery(searchParams);

  if (!isValidLatLng(query)) {
    return NextResponse.json(
      { error: "Parametri lat/lng mancanti o non validi" },
      { status: 400, headers: corsHeaders() },
    );
  }

  try {
    const result = await runPipeline(query);
    return NextResponse.json(
      {
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
      },
      { headers: corsHeaders() },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Errore pipeline", detail: (err as Error).message },
      { status: 500, headers: corsHeaders() },
    );
  }
}
