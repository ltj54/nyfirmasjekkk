import { Resolver } from "node:dns/promises";
import { request as httpsRequest } from "node:https";

export type SwedishWebsiteSuggestion = {
  url: string;
  basis: "E-postdomene" | "Navneforslag";
  status: "Svarer" | "Videresender" | "Ikke bekreftet";
  httpStatus: number | null;
};

type ProbeResult = { status: SwedishWebsiteSuggestion["status"]; httpStatus: number | null };
type Probe = (hostname: string) => Promise<ProbeResult>;

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "hotmail.com", "hotmail.se", "outlook.com", "live.com", "live.se",
  "icloud.com", "yahoo.com", "yahoo.se", "proton.me", "protonmail.com", "mail.com",
]);
const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

function isPrivateOrSharedIpv4(first: number, second: number): boolean {
  return first === 0 || first === 10 || first === 127 || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

function isReservedIpv4(first: number, second: number, third: number): boolean {
  return (first === 192 && second === 0 && (third === 0 || third === 2))
    || (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100)))
    || (first === 203 && second === 0 && third === 113);
}

export function isPublicIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second, third] = parts;
  return !isPrivateOrSharedIpv4(first, second) && !isReservedIpv4(first, second, third);
}

export function suggestSwedishDomains(name: string, email: string): Array<{ hostname: string; basis: SwedishWebsiteSuggestion["basis"] }> {
  const candidates: Array<{ hostname: string; basis: SwedishWebsiteSuggestion["basis"] }> = [];
  const emailDomain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (DOMAIN_PATTERN.test(emailDomain) && !GENERIC_EMAIL_DOMAINS.has(emailDomain)) {
    candidates.push({ hostname: emailDomain, basis: "E-postdomene" });
  }
  const baseName = name.toLowerCase()
    .replace(/\b(?:aktiebolaget|aktiebolag|ab)\b/g, "")
    .replaceAll("å", "a").replaceAll("ä", "a").replaceAll("ö", "o")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const compact = baseName.replaceAll(" ", "");
  if (compact.length >= 5 && compact.length <= 35) {
    for (const suffix of ["se", "com"]) {
      const hostname = `${compact}.${suffix}`;
      if (!candidates.some((candidate) => candidate.hostname === hostname)) {
        candidates.push({ hostname, basis: "Navneforslag" });
      }
    }
  }
  return candidates;
}

export async function probePublicHttps(hostname: string): Promise<ProbeResult> {
  if (!DOMAIN_PATTERN.test(hostname)) return { status: "Ikke bekreftet", httpStatus: null };
  const resolver = new Resolver({ timeout: 1500, tries: 1 });
  let addresses: string[];
  try {
    addresses = await resolver.resolve4(hostname);
  } catch {
    return { status: "Ikke bekreftet", httpStatus: null };
  }
  if (addresses.length === 0 || addresses.some((address) => !isPublicIpv4(address))) {
    return { status: "Ikke bekreftet", httpStatus: null };
  }
  return new Promise((resolve) => {
    const request = httpsRequest({
      hostname,
      port: 443,
      path: "/",
      method: "HEAD",
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [{ address: addresses[0], family: 4 }]);
        else callback(null, addresses[0], 4);
      },
      timeout: 2500,
      headers: { "User-Agent": "NyFirmasjekk/1.0 (website-candidate-check)" },
    }, (response) => {
      response.resume();
      const httpStatus = response.statusCode ?? null;
      if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300) {
        resolve({ status: "Svarer", httpStatus });
      } else if (httpStatus !== null && httpStatus >= 300 && httpStatus < 400) {
        resolve({ status: "Videresender", httpStatus });
      } else {
        resolve({ status: "Ikke bekreftet", httpStatus });
      }
    });
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve({ status: "Ikke bekreftet", httpStatus: null }));
    request.end();
  });
}

export async function discoverSwedishWebsiteSuggestions(
  name: string,
  email: string,
  probe: Probe = probePublicHttps,
): Promise<SwedishWebsiteSuggestion[]> {
  if (!email.trim()) return [];
  const candidates = suggestSwedishDomains(name, email);
  const checked = await Promise.all(candidates.map(async (candidate) => ({
    ...candidate,
    result: await probe(candidate.hostname),
  })));
  return checked
    .filter((candidate) => candidate.basis === "E-postdomene" || candidate.result.status !== "Ikke bekreftet")
    .map((candidate) => ({
      url: `https://${candidate.hostname}/`,
      basis: candidate.basis,
      status: candidate.result.status,
      httpStatus: candidate.result.httpStatus,
    }));
}
