package io.ltj.nyfirmasjekk.api.v1;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;

final class SafeWebTargetPolicy {
    private SafeWebTargetPolicy() {
    }

    static URI requirePublicHttpUri(String value) {
        return requireHttpUri(value, false);
    }

    static URI requireHttpUri(String value, boolean allowPrivateTargets) {
        final URI uri;
        try {
            uri = URI.create(value).normalize();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Ugyldig URL.", exception);
        }
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("Bare HTTP- og HTTPS-adresser kan kontrolleres.");
        }
        if (uri.getHost() == null || uri.getHost().isBlank() || uri.getUserInfo() != null) {
            throw new IllegalArgumentException("URL-en må ha et gyldig offentlig vertsnavn uten brukerinformasjon.");
        }
        if (uri.getPort() < -1 || uri.getPort() == 0) {
            throw new IllegalArgumentException("URL-en har ugyldig port.");
        }
        if (!allowPrivateTargets) {
            requirePublicHost(uri.getHost());
        }
        return uri;
    }

    static void requirePublicHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        if (normalized.equals("localhost") || normalized.endsWith(".localhost")
                || normalized.endsWith(".local") || normalized.endsWith(".internal")
                || normalized.endsWith(".home.arpa")) {
            throw new IllegalArgumentException("Lokale eller interne adresser kan ikke kontrolleres.");
        }

        final InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException exception) {
            throw new IllegalArgumentException("Vertsnavnet kunne ikke slås opp.", exception);
        }
        if (addresses.length == 0) {
            throw new IllegalArgumentException("Vertsnavnet har ingen offentlig IP-adresse.");
        }
        for (InetAddress address : addresses) {
            if (!isPublic(address)) {
                throw new IllegalArgumentException("Lokale, private og reserverte IP-adresser kan ikke kontrolleres.");
            }
        }
    }

    private static boolean isPublic(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) {
            return false;
        }
        byte[] bytes = address.getAddress();
        if (address instanceof Inet4Address) {
            int first = Byte.toUnsignedInt(bytes[0]);
            int second = Byte.toUnsignedInt(bytes[1]);
            return first != 0 && first != 10 && first != 127
                    && !(first == 100 && second >= 64 && second <= 127)
                    && !(first == 169 && second == 254)
                    && !(first == 172 && second >= 16 && second <= 31)
                    && !(first == 192 && second == 0)
                    && !(first == 192 && second == 168)
                    && !(first == 198 && (second == 18 || second == 19))
                    && first < 224;
        }
        if (address instanceof Inet6Address) {
            int first = Byte.toUnsignedInt(bytes[0]);
            int second = Byte.toUnsignedInt(bytes[1]);
            boolean uniqueLocal = (first & 0xfe) == 0xfc;
            boolean documentation = first == 0x20 && second == 0x01
                    && Byte.toUnsignedInt(bytes[2]) == 0x0d && Byte.toUnsignedInt(bytes[3]) == 0xb8;
            return !uniqueLocal && !documentation;
        }
        return false;
    }
}
