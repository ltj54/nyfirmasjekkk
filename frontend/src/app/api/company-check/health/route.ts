import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function GET() {
  const url = `${backendBaseUrl}/api/health`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ status: "DOWN" }, { status: 503 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "STARTING" }, { status: 503 });
  }
}
