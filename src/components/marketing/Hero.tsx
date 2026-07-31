export function Hero() {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-8">
      <h2 className="font-heading text-xl font-semibold text-ink">
        Built for the people who retype bank statements for a living
      </h2>
      <p className="text-sm leading-relaxed text-ink">
        Every month, bookkeepers, accountants, and mortgage brokers sit down
        with a stack of bank statement PDFs and an empty spreadsheet, and
        retype transactions by hand — because a bank's own export only
        feeds its own portal, and the PDF is the one format every client
        can actually hand over. StatementKit reads that PDF for you. Drop
        it in, and it comes back as a spreadsheet with real numbers,
        checked against the statement's own opening and closing balance, in
        under a minute. Your PDF is opened by JavaScript running in your
        own browser tab. It is never sent to us or anyone else. Built for
        people who'd rather bill for the hour they saved than spend it
        typing.
      </p>
    </section>
  );
}
