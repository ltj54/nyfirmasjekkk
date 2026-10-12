import { NextResponse } from "next/server";
import { backendHeaders } from "../../_lib/backend-fetch";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function GET(
  _request: Request,
  context: { params: Promise<{ organisasjonsnummer: string }> },
) {
  const { organisasjonsnummer } = await context.params;
  if (!/^\d{9}$/.test(organisasjonsnummer)) {
    return NextResponse.json({ title: "Ugyldig organisasjonsnummer" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${backendBaseUrl}/api/company-check/${organisasjonsnummer}/website-availability`,
      { cache: "no-store", headers: backendHeaders({ Accept: "application/json" }) },
    );
    if (!response.ok) {
      return new NextResponse(await response.text(), { status: response.status });
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Website availability fetch failed", error);
    return NextResponse.json({ title: "Nettsidesjekk utilgjengelig" }, { status: 502 });
  }
}
