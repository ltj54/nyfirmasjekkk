import { NextRequest, NextResponse } from "next/server";

import { fetchBackendJson } from "@/app/api/company-check/_lib/backend-fetch";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function GET(request: NextRequest) {
  const urlToInspect = request.nextUrl.searchParams.get("url") ?? "";
  const url = `${backendBaseUrl}/api/company-check/website-inspection/extended?url=${encodeURIComponent(urlToInspect)}`;

  try {
    const response = await fetchBackendJson(url);
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
