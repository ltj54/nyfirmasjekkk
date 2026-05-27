import { NextResponse } from "next/server";
import { backendHeaders } from "../../_lib/backend-fetch";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function GET(
  request: Request,
  context: { params: Promise<{ organisasjonsnummer: string }> }
) {
  const { organisasjonsnummer } = await context.params;
  const url = `${backendBaseUrl}/api/company-check/${organisasjonsnummer}/batch-eligibility`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: backendHeaders({
        Accept: "application/json",
      }),
    });

    if (!response.ok) {
      return new NextResponse(await response.text(), { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (err) {
    console.error("Fetch error:", err);
    return NextResponse.json(
      {
        title: "Backend utilgjengelig",
        detail: "Klarte ikke kontakte Spring-backend på " + url,
      },
      { status: 502 }
    );
  }
}
