const RETRYABLE_ERROR_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT"]);
const RETRY_DELAYS_MS = [250, 500, 1000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = error.cause as { code?: string } | undefined;
  return cause?.code != null && RETRYABLE_ERROR_CODES.has(cause.code);
}

export async function fetchBackendJson(url: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === RETRY_DELAYS_MS.length) {
        throw error;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}
