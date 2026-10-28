import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type WebsiteReviewStatus = "candidate" | "confirmed" | "not_found" | "unchecked";

export type WebsiteReview = {
  orgNumber: string;
  status: WebsiteReviewStatus;
  url: string;
  note: string;
  reviewedAt: string;
};

const reviewFile = path.resolve(process.cwd(), "..", "data", "scb", "website-reviews.json");
const statuses = new Set<WebsiteReviewStatus>(["candidate", "confirmed", "not_found", "unchecked"]);

export function validateWebsiteReview(value: unknown): Omit<WebsiteReview, "reviewedAt"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ugyldig nettsidevurdering.");
  const row = value as Record<string, unknown>;
  const orgNumber = typeof row.orgNumber === "string" ? row.orgNumber : "";
  const status = row.status as WebsiteReviewStatus;
  const note = typeof row.note === "string" ? row.note.trim() : "";
  const rawUrl = typeof row.url === "string" ? row.url.trim() : "";
  if (!/^\d{10}$/.test(orgNumber) || !statuses.has(status) || note.length > 1000) {
    throw new Error("Ugyldig organisasjonsnummer, status eller notat.");
  }
  if (status === "not_found" || status === "unchecked") {
    if (rawUrl) throw new Error("Denne statusen kan ikke ha en nettsideadresse.");
    return { orgNumber, status, url: "", note };
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Oppgi en fullstendig http- eller https-adresse.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")
    || url.hostname === "localhost" || url.hostname.endsWith(".local") || rawUrl.length > 2048) {
    throw new Error("Oppgi en offentlig http- eller https-adresse uten innloggingsopplysninger.");
  }
  if (status === "confirmed" && !note) {
    throw new Error("Skriv kort hvordan du bekreftet at nettsiden tilhører virksomheten.");
  }
  return { orgNumber, status, url: url.toString(), note };
}

export async function readWebsiteReviews(): Promise<Record<string, WebsiteReview>> {
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ reviewFile, "utf8")) as Record<string, WebsiteReview>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export async function saveWebsiteReview(value: unknown): Promise<WebsiteReview> {
  const review: WebsiteReview = { ...validateWebsiteReview(value), reviewedAt: new Date().toISOString() };
  const reviews = await readWebsiteReviews();
  reviews[review.orgNumber] = review;
  await mkdir(path.dirname(reviewFile), { recursive: true });
  const temporaryFile = `${reviewFile}.part`;
  await writeFile(/* turbopackIgnore: true */ temporaryFile, JSON.stringify(reviews, null, 2), "utf8");
  await rename(temporaryFile, reviewFile);
  return review;
}
