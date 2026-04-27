import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function POST(request: Request) {
  const url = `${backendBaseUrl}/api/company-check/outreach/import`;

  try {
    const body = await request.text();
    const response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      body,
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
