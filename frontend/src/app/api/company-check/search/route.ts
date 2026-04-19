import { NextResponse } from "next/server";
import { fetchBackendJson } from "../_lib/backend-fetch";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const dager = searchParams.get("dager") || "0";
  const q = searchParams.get("q");
  const county = searchParams.get("county");
  const organizationForm = searchParams.get("organizationForm");
  const score = searchParams.get("score");
  const utenNettside = searchParams.get("utenNettside") ?? "true";
  const page = searchParams.get("page") || "0";

  const params = new URLSearchParams();
  params.set("dager", dager);
  params.set("page", page);
  if (q) params.set("navn", q);
  if (county) params.set("fylke", county);
  if (organizationForm) params.set("organisasjonsform", organizationForm);
  if (score) params.set("score", score);
  params.set("utenNettside", utenNettside);

  const url = `${backendBaseUrl}/api/company-check/search?${params.toString()}`;

  try {
    const response = await fetchBackendJson(url);

    if (!response.ok) {
        return new NextResponse(await response.text(), { status: response.status });
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : data.items || [];
    const totalElements = Array.isArray(data) ? items.length : (data.totalElements ?? items.length);
    console.info(
      `[company-check/search] dager=${dager} page=${page} score=${score ?? "ALL"} q=${q ?? "-"} county=${county ?? "-"} organizationForm=${organizationForm ?? "-"} utenNettside=${utenNettside} items=${items.length} totalElements=${totalElements}`
    );
    return NextResponse.json(data);
  } catch (err) {
    console.error("Fetch error:", err);
    return NextResponse.json(
      {
        title: "Backend starter fortsatt",
        detail: "Spring-backend svarer ikke ennå på " + url,
      },
      { status: 502 }
    );
  }
}
