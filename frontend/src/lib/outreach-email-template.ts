import type { CompanySummary } from "@/lib/company-check";

type OutreachEmailCompany = Pick<
  CompanySummary,
  | "name"
  | "orgNumber"
  | "contactPersonName"
  | "email"
  | "phone"
  | "municipality"
  | "county"
  | "naceCode"
  | "naceDescription"
  | "salesSegment"
>;

export function buildOutreachEmailSubject(markdown: string, company: OutreachEmailCompany) {
  const template = extractMailSubject(markdown) ?? "Nettside for {{companyName}}?";
  return applyOutreachTemplate(template, company);
}

export function buildOutreachEmailBody(markdown: string, company: OutreachEmailCompany) {
  const template = extractMarkdownSection(markdown, "E-postmal") ?? defaultOutreachEmailTemplate();
  const cleanedTemplate = template.replace(/^Emne:\s*`?.+`?\s*$/m, "").trim();
  return applyOutreachTemplate(cleanedTemplate, company);
}

export function buildOutreachEmailHtml(body: string) {
  const lines = body.split(/\r?\n/);
  const parts: string[] = [];
  let listOpen = false;

  function closeList() {
    if (!listOpen) {
      return;
    }
    parts.push("</ul>");
    listOpen = false;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      closeList();
      continue;
    }

    if (line.startsWith("- ")) {
      if (!listOpen) {
        parts.push('<ul style="margin: 8px 0 14px 20px; padding: 0;">');
        listOpen = true;
      }
      parts.push(`<li style="margin: 4px 0;">${escapeHtml(line.slice(2))}</li>`);
      continue;
    }

    closeList();

    const nextLine = lines[index + 1]?.trim() ?? "";
    if (line === "Se eksempel her:" && isHttpUrl(nextLine)) {
      parts.push(
        `<p style="margin: 0 0 14px;">Se eksempel her: <a href="${escapeHtml(nextLine)}" style="color: #1F5FA9;">Se eksempel her</a></p>`
      );
      index += 1;
      continue;
    }

    if (isEmailAddress(line)) {
      parts.push(
        `<p style="margin: 0 0 14px;"><a href="mailto:${escapeHtml(line)}" style="color: #1F5FA9;">${escapeHtml(line)}</a></p>`
      );
      continue;
    }

    if (isHttpUrl(line)) {
      parts.push(
        `<p style="margin: 0 0 14px;"><a href="${escapeHtml(line)}" style="color: #1F5FA9;">${escapeHtml(line)}</a></p>`
      );
      continue;
    }

    parts.push(`<p style="margin: 0 0 14px;">${escapeHtml(line)}</p>`);
  }

  closeList();

  return `<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.55; color: #1F2933;">${parts.join("")}</div>`;
}

function extractMailSubject(markdown: string) {
  const section = extractMarkdownSection(markdown, "E-postmal");
  if (!section) {
    return null;
  }

  const match = section.match(/Emne:\s*`?([^\n`]+)`?/);
  return match?.[1]?.trim() ?? null;
}

function extractMarkdownSection(markdown: string, heading: string) {
  const marker = `## ${heading}`;
  const startIndex = markdown.indexOf(marker);
  if (startIndex < 0) {
    return null;
  }

  const contentStart = startIndex + marker.length;
  const remaining = markdown.slice(contentStart).trimStart();
  const nextHeadingIndex = remaining.search(/\n##\s+/);
  return (nextHeadingIndex >= 0 ? remaining.slice(0, nextHeadingIndex) : remaining).trim();
}

function applyOutreachTemplate(template: string, company: OutreachEmailCompany) {
  const contactName = company.contactPersonName?.trim() || "";
  const greeting = contactName ? firstNameFromContactName(contactName) : `dere i ${company.name}`;
  const location = [company.municipality, company.county].filter(Boolean).join(", ");
  const recipientSubject = contactName ? "du" : "dere";
  const recipientPossessive = contactName ? "ditt" : "deres";
  const recipientObject = contactName ? "deg" : "dere";
  const recipientPagePossessive = contactName ? "din" : "deres";

  const replacements: Record<string, string> = {
    "{{companyName}}": company.name,
    "{{orgNumber}}": company.orgNumber,
    "{{contactPerson}}": contactName,
    "{{companyEmail}}": company.email?.trim() || "",
    "{{companyPhone}}": company.phone?.trim() || "",
    "{{location}}": location,
    "{{naceCode}}": company.naceCode?.trim() || "",
    "{{naceDescription}}": company.naceDescription?.trim() || "",
    "{{salesSegment}}": company.salesSegment?.label ?? "Annet",
    "{{salesSegmentPitch}}": company.salesSegment?.emailPitch ?? "Jeg lager ryddige nettsider for nye virksomheter med tydelig presentasjon og kontaktinfo.",
    "{{salesSegmentExplanation}}": company.salesSegment?.explanation ?? "",
    "{{greeting}}": greeting,
    "{{recipientSubject}}": recipientSubject,
    "{{recipientPossessive}}": recipientPossessive,
    "{{recipientObject}}": recipientObject,
    "{{recipientPagePossessive}}": recipientPagePossessive,
    "{{price}}": "4.500",
    "{{senderName}}": "Lars Tangen Johannessen",
    "{{senderPhone}}": "977 24 209",
    "{{senderEmail}}": "latajo@gmail.no",
    "{{senderWebsite}}": "https://ltj54.github.io/ltj-production/",
  };

  let nextText = template;
  for (const [key, value] of Object.entries(replacements)) {
    nextText = nextText.replaceAll(key, value);
  }

  return nextText
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function defaultOutreachEmailTemplate() {
  return `Hei {{greeting}},

Gratulerer med {{companyName}}.

{{salesSegmentPitch}}

Jeg setter opp dette ferdig for {{recipientObject}}.

Du får:
- En ryddig nettside
- Egen nettadresse, for eksempel firmanavn.no
- Kontaktinfo og enkel presentasjon av tjenestene
- Klar løsning {{recipientSubject}} kan bruke med en gang

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel:
{{senderWebsite}}

Si ifra hvis du vil at jeg lager et konkret forslag til {{recipientPagePossessive}} side - helt uforpliktende.

Mvh
{{senderName}}
{{senderPhone}}
{{senderEmail}}`;
}

function firstNameFromContactName(value: string) {
  return value.split(/\s+/)[0] ?? value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value);
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
