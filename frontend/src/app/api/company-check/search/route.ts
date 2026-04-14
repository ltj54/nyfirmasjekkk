import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const dager = searchParams.get("dager") || "30";
  const q = searchParams.get("q");
  const county = searchParams.get("county");
  const municipality = searchParams.get("municipality");
  const organizationForm = searchParams.get("organizationForm");
  const params = new URLSearchParams();
  params.set("daysRegisteredMax", dager);
  if (q) params.set("q", q);
  if (county) params.set("county", county);
  if (municipality) params.set("municipality", municipality);
  if (organizationForm) params.set("organizationForm", organizationForm);
  
  const url = `${backendBaseUrl}/api/v1/companies?${params.toString()}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      {
        title: "Backend utilgjengelig",
        detail: "Klarte ikke kontakte Spring-backend.",
      },
      { status: 502 }
    );
  }
}
