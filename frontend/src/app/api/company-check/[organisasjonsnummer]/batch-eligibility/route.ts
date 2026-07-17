import { NextResponse } from "next/server";
import { backendHeaders } from "../../_lib/backend-fetch";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";
const BACKEND_TIMEOUT_MS = 8_000;

export async function GET(
  request: Request,
  context: { params: Promise<{ organisasjonsnummer: string }> }
) {
  const { organisasjonsnummer } = await context.params;
  const url = `${backendBaseUrl}/api/company-check/${organisasjonsnummer}/batch-eligibility`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: backendHeaders({
        Accept: "application/json",
      }),
    });

    if (!response.ok) {
      return new NextResponse(await response.text(), { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[company-check/batch-eligibility] Timeout etter ${BACKEND_TIMEOUT_MS} ms for ${organisasjonsnummer}`);
      return NextResponse.json(
        {
          title: "Batch-sjekk tok for lang tid",
          detail: "Nettsidekontrollen ble ikke ferdig innen tidsgrensen.",
        },
        { status: 504 },
      );
    }
    console.error("Fetch error:", err);
    return NextResponse.json(
      {
        title: "Backend utilgjengelig",
        detail: "Klarte ikke kontakte Spring-backend på " + url,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
