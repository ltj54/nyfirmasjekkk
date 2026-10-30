import { isLocalApiRequest } from "@/lib/local-api-access";
import { prepareRecentSwedishCompanies } from "@/lib/sweden-prepared";
import { loadRecentSwedishCompanies } from "@/lib/sweden-recent";

export const runtime = "nodejs";
export const maxDuration = 300;

let busy = false;

export function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "Hentingen må startes fra den lokale appen." }, { status: 403 });
  }
  if (busy) return Response.json({ error: "En svensk registerhenting pågår allerede." }, { status: 409 });
  const apiKey = process.env.SCB_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "SCB-tilgang må konfigureres før listen kan klargjøres." }, { status: 503 });
  busy = true;
  const encoder = new TextEncoder();
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };
      send({ kind: "source" });
      void (async () => {
        try {
          const recent = await loadRecentSwedishCompanies();
          const result = await prepareRecentSwedishCompanies(recent, apiKey, {
            onProgress: (progress) => send({ kind: "progress", progress }),
          });
          send({ kind: "result", result });
        } catch (error) {
          // An upstream error can contain an E identifier in its URL. Do not log or return it.
          console.error("Svensk registerklargjøring feilet", error instanceof Error ? error.name : "Ukjent feil");
          send({ kind: "error", error: "Klargjøringen kunne ikke fullføres. Prøv igjen senere." });
        } finally {
          busy = false;
          if (open) controller.close();
        }
      })();
    },
    cancel() { open = false; },
  });
  return new Response(stream, { headers: {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
  } });
}
