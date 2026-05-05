import { NextResponse } from "next/server";
import { fetchBackendJson } from "../_lib/backend-fetch";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8080";

function buildSearchLogLine({
  dager,
  page,
  score,
  q,
  county,
  organizationForm,
  hasEmail,
  hasWebsite,
  missingWebsite,
  items,
  totalElements,
}: {
  dager: string;
  page: string;
  score: string | null;
  q: string | null;
  county: string | null;
  organizationForm: string | null;
  hasEmail: string | null;
  hasWebsite: string | null;
  missingWebsite: string | null;
  items: number;
  totalElements: number;
}) {
  const parts = [`dager=${dager}`, `page=${page}`];

  if (score) parts.push(`score=${score}`);
  if (q) parts.push(`q=${q}`);
  if (county) parts.push(`county=${county}`);
  if (organizationForm) parts.push(`organizationForm=${organizationForm}`);
  if (hasEmail === "true") parts.push("hasEmail=true");
  if (hasWebsite === "true") parts.push("hasWebsite=true");
  if (missingWebsite === "true") parts.push("missingWebsite=true");

  parts.push(`items=${items}`);
  parts.push(`totalElements=${totalElements}`);

  return parts.join(" ");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const dager = searchParams.get("dager") || "0";
  const q = searchParams.get("q");
  const county = searchParams.get("county");
  const organizationForm = searchParams.get("organizationForm");
  const score = searchParams.get("score");
  const hasEmail = searchParams.get("hasEmail");
  const hasWebsite = searchParams.get("hasWebsite");
  const missingWebsite = searchParams.get("missingWebsite");
  const page = searchParams.get("page") || "0";

  const params = new URLSearchParams();
  params.set("dager", dager);
  params.set("page", page);
  if (q) params.set("navn", q);
  if (county) params.set("fylke", county);
  if (organizationForm) params.set("organisasjonsform", organizationForm);
  if (score) params.set("score", score);
  if (hasEmail === "true") params.set("hasEmail", "true");
  if (hasWebsite === "true") params.set("hasWebsite", "true");
  if (missingWebsite === "true") params.set("missingWebsite", "true");

  const url = `${backendBaseUrl}/api/company-check/search?${params.toString()}`;

  try {
    const response = await fetchBackendJson(url);

    if (!response.ok) {
        return new NextResponse(await response.text(), { status: response.status });
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : data.items || [];
    const totalElements = Array.isArray(data) ? items.length : (data.totalElements ?? items.length);
    console.info(`[company-check/search] ${buildSearchLogLine({
      dager,
      page,
      score,
      q,
      county,
      organizationForm,
      hasEmail,
      hasWebsite,
      missingWebsite,
      items: items.length,
      totalElements,
    })}`);
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
