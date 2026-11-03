import assert from "node:assert/strict";
import test from "node:test";

import {
  suggestedSwedishWebsiteIdea,
  swedishActivityDescription,
  swedishEmailDraftAvailability,
  swedishWebsiteOfferDraft,
} from "../src/lib/sweden-email-draft.ts";

const description = "E-handel och försäljning av kläder, träningskläder, huvudbonader och modeaccessoarer samt därmed förenlig verksamhet.";

test("Junwear draft uses the registered product groups without legal boilerplate", () => {
  const activity = swedishActivityDescription(description);
  const idea = suggestedSwedishWebsiteIdea(description);
  const draft = swedishWebsiteOfferDraft({
    companyName: "Junwear", activity, idea, noWebsiteFoundManually: true,
  });
  assert.match(draft.body, /kläder, träningskläder, huvudbonader och modeaccessoarer/);
  assert.doesNotMatch(draft.body, /därmed förenlig verksamhet/);
  assert.match(draft.body, /När jag letade efter Junwear hittade jag ingen webbplats/);
  assert.match(draft.body, /1 990 SEK/);
  assert.match(draft.body, /https:\/\/www\.ltj-production\.no\/sv\//);
});

test("an unverified website status does not claim that none was found", () => {
  const draft = swedishWebsiteOfferDraft({
    companyName: "Junwear", activity: swedishActivityDescription(description),
    idea: suggestedSwedishWebsiteIdea(description), noWebsiteFoundManually: false,
  });
  assert.doesNotMatch(draft.body, /hittade jag ingen webbplats/);
});

test("non-commerce activity does not mention a web shop", () => {
  const draft = swedishWebsiteOfferDraft({
    companyName: "Exempel", activity: "rådgivning inom kultur",
    idea: "en sida som beskriver tjänsterna", noWebsiteFoundManually: false,
  });
  assert.doesNotMatch(draft.body, /webbutik|Betalning och orderhantering/);
});

test("a responding possible website blocks the draft, even if contact data is eligible", () => {
  const suggestions = [{
    url: "https://kortelainengroup.se/", basis: "E-postdomene", status: "Svarer", httpStatus: 200,
  }];
  assert.equal(swedishEmailDraftAvailability("eligible", suggestions), "possible_website");
});

test("the draft stays closed until website candidates have been checked", () => {
  assert.equal(swedishEmailDraftAvailability("eligible", undefined), "needs_website_check");
  assert.equal(swedishEmailDraftAvailability("eligible", []), "available");
  assert.equal(swedishEmailDraftAvailability("eligible", [{
    url: "https://example.se/", basis: "E-postdomene", status: "Ikke bekreftet", httpStatus: null,
  }]), "available");
  assert.equal(swedishEmailDraftAvailability("blocked", []), "not_eligible");
});

test("a beauty salon with incidental product sales receives a treatment-focused draft", () => {
  const salonDescription = "Företaget ska bedriva skönhetsbehandlingar med huvudsaklig inriktning på fransförlängning, styling av fransar och bryn (såsom lash lift och brow lift). Verksamheten ska även omfatta försäljning av relaterade skönhetsprodukter och eftervårdsprodukter till konsumenter, samt därmed förenlig verksamhet.";
  const activity = swedishActivityDescription(salonDescription);
  const idea = suggestedSwedishWebsiteIdea(salonDescription);
  const draft = swedishWebsiteOfferDraft({
    companyName: "Luma salong", activity, idea, noWebsiteFoundManually: false,
  });
  assert.match(draft.body, /fransförlängning/);
  assert.match(draft.body, /lash lift och brow lift/);
  assert.match(draft.body, /eftervårdsprodukter/);
  assert.doesNotMatch(draft.body, /Företaget ska bedriva|Verksamheten ska även omfatta/);
  assert.doesNotMatch(draft.body, /fullständig webbutik|Betalning och orderhantering/);
  assert.doesNotMatch(draft.body, /hittade jag ingen webbplats/);
});
