"use client";

export function PrintInvoiceButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white print:hidden">Skriv ut / lagre som PDF</button>;
}

