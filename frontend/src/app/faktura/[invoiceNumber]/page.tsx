import { notFound } from "next/navigation";

import { PrintInvoiceButton } from "@/components/print-invoice-button";
import { findIssuedInvoice } from "@/lib/invoice-register-store";

export const dynamic = "force-dynamic";

function money(value: number): string {
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK" }).format(value);
}

export default async function InvoicePage({ params }: Readonly<{ params: Promise<{ invoiceNumber: string }> }>) {
  const { invoiceNumber } = await params;
  if (!/^\d{4}-\d{3,}$/.test(invoiceNumber)) notFound();
  const invoice = await findIssuedInvoice(invoiceNumber);
  if (!invoice) notFound();
  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-white p-8 text-slate-900 sm:p-14 print:max-w-none print:p-8">
      <div className="mb-8 flex justify-end"><PrintInvoiceButton /></div>
      <header className="flex flex-col justify-between gap-6 border-b border-slate-300 pb-8 sm:flex-row">
        <div><p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Faktura</p><h1 className="mt-2 text-4xl font-bold">{invoice.invoiceNumber}</h1></div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-sm"><dt>Fakturadato</dt><dd className="font-semibold">{invoice.invoiceDate}</dd><dt>Forfallsdato</dt><dd className="font-semibold">{invoice.dueDate}</dd></dl>
      </header>
      <section className="grid gap-8 border-b border-slate-300 py-8 sm:grid-cols-2">
        <div><h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fra</h2><p className="mt-3 font-semibold">LTJ PRODUCTION JOHANNESSEN</p><p>Øvre Holen 11 F<br />5163 LAKSEVÅG</p><p className="mt-2">Org.nr. 838 632 122<br />kontakt@ltj-production.no<br />Kontonr. 6098.08.05657</p></div>
        <div><h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Til</h2><p className="mt-3 whitespace-pre-line font-semibold">{invoice.customerName}</p><p className="whitespace-pre-line">{invoice.customerAddress}</p>{invoice.customerOrgNumber ? <p className="mt-2">Org.nr. {invoice.customerOrgNumber}</p> : null}{invoice.customerEmail ? <p>{invoice.customerEmail}</p> : null}</div>
      </section>
      <section className="py-8"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-slate-300 text-xs uppercase tracking-wider text-slate-500"><th className="py-3">Beskrivelse</th><th className="py-3 text-right">Beløp</th></tr></thead><tbody><tr className="align-top"><td className="py-5 pr-8"><p>{invoice.description}</p><p className="mt-2 text-sm text-slate-600">Levert {invoice.deliveryDate} · {invoice.deliveryPlace}</p></td><td className="py-5 text-right">{money(invoice.amount)}</td></tr></tbody></table></section>
      <section className="ml-auto max-w-sm border-t border-slate-300 pt-4"><dl className="grid grid-cols-[1fr_auto] gap-2"><dt>Sum eks. MVA</dt><dd>{money(invoice.amount)}</dd><dt>MVA</dt><dd>{money(invoice.vatAmount)}</dd><dt className="border-t border-slate-300 pt-3 text-lg font-bold">Å betale</dt><dd className="border-t border-slate-300 pt-3 text-lg font-bold">{money(invoice.totalAmount)}</dd></dl></section>
      <footer className="mt-16 border-t border-slate-300 pt-6 text-sm text-slate-600"><p>Betal innen {invoice.dueDate} til konto 6098.08.05657. Merk betalingen med {invoice.invoiceNumber}.</p><p className="mt-2">Foretaket er ikke registrert i Merverdiavgiftsregisteret. Ingen MVA er beregnet.</p></footer>
    </main>
  );
}

