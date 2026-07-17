package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;
import java.util.Set;

public final class SalesSegmentCatalog {
    private static final SalesSegment HANDVERK = new SalesSegment(
            "HANDVERK",
            "Bygg og håndverk",
            100,
            "Bygg- og håndverkstjenester der lokal synlighet, tjenesteoversikt og rask kontakt ofte er viktig.",
            "For bygg- og håndverksbedrifter er det ofte viktig at kunder raskt ser hvilke tjenester dere tilbyr, hvilket område dere dekker og hvordan de kan ta kontakt."
    );
    private static final SalesSegment RENHOLD_OG_DRIFT = new SalesSegment(
            "RENHOLD_OG_DRIFT",
            "Renhold og drift",
            95,
            "Renhold, vaktmester og drift der lokal synlighet og rask kontakt ofte gir konkret verdi.",
            "For renhold, vaktmester og drift er en nettside nyttig for å vise tjenester, område, kontaktinfo og hvordan nye kunder kan bestille eller be om tilbud."
    );
    private static final SalesSegment HAGE_OG_GRONTANLEGG = new SalesSegment(
            "HAGE_OG_GRONTANLEGG",
            "Hage og grøntanlegg",
            92,
            "Gartner-, hage- og grøntanleggstjenester der område, sesongtjenester og kontaktinfo bør være lett å finne.",
            "For gartner- og hagebedrifter er en nettside nyttig for å vise tjenester, område dere dekker, sesongarbeid og hvordan kunder kan ta kontakt."
    );
    private static final SalesSegment PERSONLIG_TJENESTE = new SalesSegment(
            "PERSONLIG_TJENESTE",
            "Personlig tjeneste",
            90,
            "Personlige tjenester der presentasjon, åpningstider, behandlinger og booking ofte bør være tydelig.",
            "For personlige tjenester er en nettside nyttig for å vise tjenester, åpningstider, kontaktinfo og eventuell booking på en ryddig måte."
    );
    private static final SalesSegment HELSE_VELVAERE = new SalesSegment(
            "HELSE_VELVAERE",
            "Helse og velvære",
            88,
            "Helse- og velværetjenester der tillit, behandlinger, åpningstider og tydelig booking/kontakt er viktig.",
            "For helse, velvære og behandling er det viktig at kunder raskt finner tjenester, åpningstider, kontaktinfo og eventuell bestilling."
    );
    private static final SalesSegment KONSULENT = new SalesSegment(
            "KONSULENT",
            "Konsulent og fag",
            85,
            "Konsulenter og fagfolk som ofte trenger en seriøs visitkortside med kompetanse, tjenester og kontaktinfo.",
            "For konsulent- og rådgivningsvirksomheter er en nettside nyttig for å vise hva dere tilbyr, hvem dere hjelper og hvordan kunder kan ta kontakt."
    );
    private static final SalesSegment MAT_SERVERING = new SalesSegment(
            "MAT_SERVERING",
            "Mat og servering",
            80,
            "Servering og matrelaterte virksomheter der meny, åpningstider, sted og kontakt raskt bør være synlig.",
            "For mat- og serveringssteder er en nettside nyttig for å vise produkter, åpningstider, sted, kontaktinfo og praktisk informasjon."
    );
    private static final SalesSegment BUTIKK_LOKALHANDEL = new SalesSegment(
            "BUTIKK_LOKALHANDEL",
            "Butikk og lokalhandel",
            70,
            "Lokalhandel der synlighet, åpningstider, vareutvalg og kontaktpunkt kan være nyttig.",
            "For butikker og produktbaserte virksomheter er en nettside nyttig for å vise produkter, åpningstider, kontaktinfo og hvor kundene finner dere."
    );
    private static final SalesSegment TRANSPORT = new SalesSegment(
            "TRANSPORT",
            "Transport",
            70,
            "Transport, bud og logistikk der tjenesteområde og kontaktpunkt ofte bør være tydelig.",
            "For transport- og budtjenester er en nettside nyttig for å vise tjenester, område dere dekker og hvordan kunder kan ta kontakt."
    );
    private static final SalesSegment EIENDOM = new SalesSegment(
            "EIENDOM",
            "Eiendom",
            65,
            "Eiendomsrelatert virksomhet kan trenge en ryddig presentasjon, men er ofte noe mindre direkte enn håndverk og tjenester.",
            "For eiendomsrelaterte virksomheter er en nettside nyttig for å vise hva virksomheten gjør, kontaktinfo og en ryddig presentasjon."
    );
    private static final SalesSegment IKKE_PRIORITERT = new SalesSegment(
            "IKKE_PRIORITERT",
            "Ikke prioritert",
            20,
            "NACE-koden peker på en gruppe som vanligvis er mindre relevant for nettside-outreach nå.",
            "En nettside kan være nyttig for å samle kontaktinfo, aktivitet og praktisk informasjon på ett fast sted."
    );
    private static final SalesSegment FORENING_KLUBB = new SalesSegment(
            "FORENING_KLUBB",
            "Forening og klubb",
            15,
            "Foreninger, idrettslag og klubber har ofte lav betalingsvilje og bruker gjerne Facebook, Spond eller eksisterende klubbverktøy.",
            "For foreninger og kulturaktører er en nettside nyttig for å samle informasjon om aktivitet, kontaktpersoner, arrangementer og lenker til sosiale medier."
    );
    private static final SalesSegment ANNET = new SalesSegment(
            "ANNET",
            "Annet",
            40,
            "Ingen spesifikk salgsgruppe er definert for denne NACE-koden ennå.",
            "For nye virksomheter er en nettside nyttig for å vise hva dere tilbyr, hvem dere hjelper og hvordan kunder kan ta kontakt."
    );

    private static final Set<String> HANDVERK_CODES = Set.of("43.210", "43.221", "43.222", "43.320", "43.341", "43.342", "43.390", "43.990");
    private static final Set<String> RENHOLD_CODES = Set.of("81.210", "81.220", "81.290");
    private static final Set<String> PERSONLIG_CODES = Set.of("96.010", "96.020", "96.030", "96.090");
    private static final Set<String> KONSULENT_CODES = Set.of("70.220", "71.111", "71.112", "71.121", "71.129", "74.200", "74.300", "74.900");
    private static final List<String> DEPRIORITIZED_PREFIXES = List.of("01", "02", "03", "46", "64", "65", "66", "84", "97", "98", "99");

    private SalesSegmentCatalog() {
    }

    public static SalesSegment fromNaceCode(String naceCode) {
        String code = normalize(naceCode);
        if (code == null) {
            return ANNET;
        }
        if (code.startsWith("94")) {
            return FORENING_KLUBB;
        }
        if (HANDVERK_CODES.contains(code) || startsWithAny(code, "41", "42", "43")) {
            return HANDVERK;
        }
        if (code.equals("81.300") || code.startsWith("81.3")) {
            return HAGE_OG_GRONTANLEGG;
        }
        if (RENHOLD_CODES.contains(code) || code.startsWith("81")) {
            return RENHOLD_OG_DRIFT;
        }
        if ("96.040".equals(code) || code.startsWith("86") || code.startsWith("88")) {
            return HELSE_VELVAERE;
        }
        if (PERSONLIG_CODES.contains(code) || code.startsWith("96")) {
            return PERSONLIG_TJENESTE;
        }
        if (KONSULENT_CODES.contains(code) || startsWithAny(code, "62", "63", "69", "70", "71", "72", "74")) {
            return KONSULENT;
        }
        if (code.startsWith("56")) {
            return MAT_SERVERING;
        }
        if (code.startsWith("47")) {
            return BUTIKK_LOKALHANDEL;
        }
        if (startsWithAny(code, "49", "52", "53")) {
            return TRANSPORT;
        }
        if (code.startsWith("68")) {
            return EIENDOM;
        }
        if (DEPRIORITIZED_PREFIXES.stream().anyMatch(code::startsWith)) {
            return IKKE_PRIORITERT;
        }
        return ANNET;
    }

    private static boolean startsWithAny(String code, String... prefixes) {
        for (String prefix : prefixes) {
            if (code.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String naceCode) {
        if (naceCode == null || naceCode.isBlank()) {
            return null;
        }
        String digits = naceCode.replaceAll("\\D", "");
        if (digits.length() < 2) {
            return null;
        }
        if (digits.length() >= 5) {
            return digits.substring(0, 2) + "." + digits.substring(2, 5);
        }
        if (digits.length() == 4) {
            return digits.substring(0, 2) + "." + digits.substring(2, 4);
        }
        return digits.substring(0, 2);
    }
}
