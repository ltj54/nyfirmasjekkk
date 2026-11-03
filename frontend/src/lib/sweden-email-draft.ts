import type { SwedishWebsiteSuggestion } from "./sweden-website-suggestions";

export type SwedishEmailDraftInput = {
  companyName: string;
  activity: string;
  idea: string;
  noWebsiteFoundManually: boolean;
};

export type SwedishEmailDraftAvailability = "available" | "needs_website_check" | "possible_website" | "not_eligible";

export function swedishEmailDraftAvailability(
  contactAssessment: string,
  suggestions: SwedishWebsiteSuggestion[] | undefined,
): SwedishEmailDraftAvailability {
  if (contactAssessment !== "eligible") return "not_eligible";
  if (!suggestions) return "needs_website_check";
  if (suggestions.some((suggestion) => suggestion.status === "Svarer" || suggestion.status === "Videresender")) {
    return "possible_website";
  }
  return "available";
}

export function swedishActivityDescription(description: string): string {
  const intro = "Företaget ska bedriva";
  const extraActivity = "Verksamheten ska även omfatta";
  const boilerplate = "samt därmed förenlig verksamhet";
  let activity = description.trim();
  if (activity.toLocaleLowerCase("sv-SE").startsWith(intro.toLocaleLowerCase("sv-SE"))) {
    activity = activity.slice(intro.length).trimStart();
  }
  const extraIndex = activity.toLocaleLowerCase("sv-SE").indexOf(extraActivity.toLocaleLowerCase("sv-SE"));
  const beforeExtra = activity.slice(0, extraIndex).trimEnd();
  if (extraIndex > 0 && beforeExtra.endsWith(".")) activity = beforeExtra;
  activity = removeFinalPeriod(activity);
  if (activity.toLocaleLowerCase("sv-SE").endsWith(boilerplate)) {
    activity = activity.slice(0, -boilerplate.length).trimEnd();
  }
  activity = removeFinalPeriod(activity).replace(/med huvudsaklig inriktning på/i, "med fokus på");
  const suchAsIndex = activity.toLocaleLowerCase("sv-SE").indexOf("(såsom ");
  const closingIndex = suchAsIndex < 0 ? -1 : activity.indexOf(")", suchAsIndex);
  if (closingIndex > suchAsIndex) {
    const example = activity.slice(suchAsIndex + "(såsom ".length, closingIndex);
    activity = `${activity.slice(0, suchAsIndex)}– till exempel ${example}${activity.slice(closingIndex + 1)}`;
  }
  if (!activity) return "";
  return activity.charAt(0).toLocaleLowerCase("sv-SE") + activity.slice(1);
}

function removeFinalPeriod(value: string): string {
  const trimmed = value.trimEnd();
  return trimmed.endsWith(".") ? trimmed.slice(0, -1).trimEnd() : trimmed;
}

export function suggestedSwedishWebsiteIdea(description: string): string {
  if (/skönhetsbehandling|fransförlängning|lash lift|brow lift|salong/i.test(description)) {
    const treatmentIdea = "en sida där besökare ser vilka behandlingar du erbjuder, med plats för bilder och prisinformation och ett enkelt sätt att fråga om tider";
    return /eftervårdsprodukter/i.test(description)
      ? `${treatmentIdea}, samt en liten del för de eftervårdsprodukter du säljer`
      : treatmentIdea;
  }
  if (/e-handel|webbutik|försäljning av/i.test(description)) {
    return "en första sida med bilder, tydliga ingångar till varugrupperna och information om hur kunderna kan handla";
  }
  return "en första sida som visar vad du erbjuder och gör det enkelt att ta kontakt";
}

export function swedishWebsiteOfferDraft(input: SwedishEmailDraftInput): { subject: string; body: string } {
  const companyName = input.companyName.trim();
  const activity = removeFinalPeriod(input.activity.trim());
  const idea = removeFinalPeriod(input.idea.trim());
  const activitySentence = activity
    ? `Jag såg att ${companyName} är registrerat för ${activity}.`
    : `Jag såg att ${companyName} nyligen registrerades.`;
  const websiteSentence = input.noWebsiteFoundManually
    ? `När jag letade efter ${companyName} hittade jag ingen webbplats, så jag ville höra om du har börjat fundera på en egen.`
    : "Jag ville höra om en egen webbplats kan vara aktuell för verksamheten.";
  const ideaSentence = idea
    ? `Jag skulle kunna göra ${idea}.`
    : "Jag skulle kunna göra en första sida utifrån det du vill visa för kunderna.";
  const beauty = /skönhetsbehandling|fransförlängning|lash lift|brow lift|salong/i.test(activity);
  const commerce = !beauty && /e-handel|webbutik|försäljning/i.test(activity);
  let presentationSentence = "Med dina bilder och texter kan sidan ge besökare en tydlig bild av verksamheten.";
  if (beauty) presentationSentence = "Korta beskrivningar och bilder kan hjälpa kunderna att välja rätt behandling innan de tar kontakt.";
  else if (commerce) presentationSentence = "Med dina bilder och texter kan sidan ge besökare en tydlig bild av sortimentet, även om du vill vänta med en fullständig webbutik.";
  const scopeSentence = commerce
    ? "Betalning och orderhantering ingår inte i det priset."
    : "Vi avtalar innehållet innan arbetet börjar.";

  return {
    subject: `En webbplats för ${companyName}?`,
    body: `Hej,\n\nJag heter Lars Johannessen och bygger webbplatser. ${activitySentence} ${websiteSentence}\n\n${ideaSentence} ${presentationSentence}\n\nOm det låter intressant skickar jag gärna en kort, kostnadsfri skiss. Då får du något konkret att titta på innan du bestämmer dig.\n\nEn enkel webbplats med det innehåll vi kommer överens om kostar fast 1 990 SEK. ${scopeSentence}\n\nVill du att jag skickar en skiss?\n\nVänliga hälsningar\nLars Johannessen\nhttps://www.ltj-production.no/sv/\n+47 977 24 209\nkontakt@ltj-production.no\nOrganisationsnummer: 838 632 122`,
  };
}
