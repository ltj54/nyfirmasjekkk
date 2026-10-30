import type { PreparedSwedishRecentResult, SwedishPreparationProgress } from "./sweden-prepared";

export type SwedishPreparationState = SwedishPreparationProgress | { phase: "source"; completed: 0; total: 0 };

/** Reads newline-delimited progress events without waiting for the complete response. */
export async function readSwedishPreparationStream(
  body: ReadableStream<Uint8Array> | null,
  onUpdate: (state: SwedishPreparationState) => void,
): Promise<PreparedSwedishRecentResult> {
  if (!body) throw new Error("Serveren returnerte ingen fremdrift. Prøv igjen.");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let remaining = "";
  let result: PreparedSwedishRecentResult | null = null;

  function handleLine(line: string) {
    if (!line.trim()) return;
    const event = JSON.parse(line) as {
      kind?: string;
      progress?: SwedishPreparationProgress;
      result?: PreparedSwedishRecentResult;
      error?: string;
    };
    if (event.kind === "source") onUpdate({ phase: "source", completed: 0, total: 0 });
    if (event.kind === "progress" && event.progress) onUpdate(event.progress);
    if (event.kind === "result" && event.result) result = event.result;
    if (event.kind === "error") throw new Error(event.error ?? "Klargjøringen mislyktes.");
  }

  function handleAvailableLines() {
    let newline = remaining.indexOf("\n");
    while (newline !== -1) {
      handleLine(remaining.slice(0, newline));
      remaining = remaining.slice(newline + 1);
      newline = remaining.indexOf("\n");
    }
    if (remaining.length > 10_000_000) throw new Error("Serveren returnerte for mye data.");
  }

  async function readNext(): Promise<void> {
    const chunk = await reader.read();
    if (chunk.done) return;
    remaining += decoder.decode(chunk.value, { stream: true });
    handleAvailableLines();
    await readNext();
  }

  try {
    await readNext();
    remaining += decoder.decode();
    handleLine(remaining);
    if (!result) throw new Error("Klargjøringen ble avbrutt før listen var ferdig.");
    return result;
  } finally {
    reader.releaseLock();
  }
}
