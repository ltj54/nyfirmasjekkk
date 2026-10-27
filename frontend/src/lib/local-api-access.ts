const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export function isLocalApiRequest(host: string | null, method: string, origin: string | null): boolean {
  if (!host) return false;

  let requestHost: URL;
  try {
    requestHost = new URL(`http://${host}`);
  } catch {
    return false;
  }

  if (!LOOPBACK_HOSTS.has(requestHost.hostname)
    || requestHost.pathname !== "/"
    || requestHost.search
    || requestHost.hash) {
    return false;
  }

  return SAFE_METHODS.has(method.toUpperCase()) || origin === requestHost.origin;
}
