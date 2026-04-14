import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export async function GET(
  request: Request,
  context: { params: Promise<{ organisasjonsnummer: string }> }
) {
  const { organisasjonsnummer } = await context.params;

  // Use the new V1 API if it's a 9-digit number
  const isOrgNumber = /^\d{9}$/.test(organisasjonsnummer);
  const url = isOrgNumber
    ? `${backendBaseUrl}/api/v1/companies/${organisasjonsnummer}`
    : `${backendBaseUrl}/api/v1/companies?q=${encodeURIComponent(organisasjonsnummer)}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const contentType =
      response.headers.get("content-type") ?? "application/json; charset=utf-8";
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      {
        title: "Backend utilgjengelig",
        detail:
          "Klarte ikke kontakte Spring-backend. Start backend-en og prøv igjen.",
      },
      { status: 502 }
    );
  }
}
