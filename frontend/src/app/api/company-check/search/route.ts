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
  websiteLeadCohort,
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
  websiteLeadCohort: string | null;
  items: number;
  totalElements: number;
}) {
  const logFields = {
    score,
    q,
    county,
    organizationForm,
    hasEmail,
    hasWebsite,
    missingWebsite,
    websiteLeadCohort,
  };
  const optionalParts = Object.entries(logFields)
    .filter(([, value]) => value !== null && value !== "false" && value !== "")
    .map(([key, value]) => `${key}=${value}`);
  return [`dager=${dager}`, `page=${page}`, ...optionalParts, `items=${items}`, `totalElements=${totalElements}`].join(" ");
}

function buildBackendSearchParams(searchParams: URLSearchParams) {
  const params = new URLSearchParams({
    dager: searchParams.get("dager") || "0",
    page: searchParams.get("page") || "0",
  });
  const namedParams = { q: "navn", county: "fylke", organizationForm: "organisasjonsform", score: "score" };
  Object.entries(namedParams).forEach(([source, target]) => {
    const value = searchParams.get(source);
    if (value) params.set(target, value);
  });
  ["hasEmail", "hasWebsite", "missingWebsite", "websiteLeadCohort"].forEach((name) => {
    if (searchParams.get(name) === "true") params.set(name, "true");
  });
  if (params.get("websiteLeadCohort") === "true") {
    if (searchParams.get("websiteLeadRanking") === "true") params.set("websiteLeadRanking", "true");
    params.set("websiteLeadOldestMonths", searchParams.get("websiteLeadOldestMonths") === "12" ? "12" : "7");
  }
  return params;
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
  const websiteLeadCohort = searchParams.get("websiteLeadCohort");
  const page = searchParams.get("page") || "0";

  const params = buildBackendSearchParams(searchParams);

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
      websiteLeadCohort,
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
