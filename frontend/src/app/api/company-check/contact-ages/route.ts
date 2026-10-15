import { NextResponse } from "next/server";

import { backendHeaders } from "@/app/api/company-check/_lib/backend-fetch";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function POST(request: Request) {
  const orgNumbers = await request.json().catch(() => []);
  try {
    const response = await fetch(`${backendBaseUrl}/api/company-check/contact-ages`, {
      method: "POST",
      cache: "no-store",
      headers: backendHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(Array.isArray(orgNumbers) ? orgNumbers : []),
    });
    if (!response.ok) {
      return new NextResponse(await response.text(), { status: response.status });
    }
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: "Aldersoppslag er utilgjengelig." }, { status: 502 });
  }
}
