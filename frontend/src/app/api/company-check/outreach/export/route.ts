import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function GET() {
  const url = `${backendBaseUrl}/api/company-check/outreach/export`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/x-ndjson",
      },
    });

    const body = await response.text();
    if (!response.ok) {
      return new NextResponse(body, { status: response.status });
    }

    return new NextResponse(body, {
      headers: {
        "Content-Disposition": 'attachment; filename="outreach-log-export.jsonl"',
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    });
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
