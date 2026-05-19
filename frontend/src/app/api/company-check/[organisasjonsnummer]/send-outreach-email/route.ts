import { NextResponse } from "next/server";

import { backendHeaders } from "@/app/api/company-check/_lib/backend-fetch";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function POST(
  request: Request,
  context: { params: Promise<{ organisasjonsnummer: string }> }
) {
  const { organisasjonsnummer } = await context.params;
  const url = `${backendBaseUrl}/api/company-check/${organisasjonsnummer}/send-outreach-email`;

  try {
    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: backendHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: await request.text(),
    });

    if (!response.ok) {
      return new NextResponse(await response.text(), { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      {
        title: "Backend utilgjengelig",
        detail: "Klarte ikke kontakte Spring-backend på " + url,
      },
      { status: 502 }
    );
  }
}
