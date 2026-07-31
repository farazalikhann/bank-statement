const STEPS = [
  {
    title: 'Reading the PDF',
    body: `A bank statement PDF isn't a table underneath — it's text positioned at x/y coordinates on a page, the way a typewriter lays it out. StatementKit pulls every piece of text off every page along with its position, groups the pieces that share a row into a line, then looks at the gaps between columns of text across all those lines to work out where "Date" ends and "Description" begins, and where amount and balance sit. It runs this per page, because some banks reset column positions between pages of the same statement.`,
  },
  {
    title: 'Verifying the numbers',
    body: `Enter the opening and closing balance printed on the statement, and StatementKit walks every transaction in order, running a balance forward from the first row to the last, and tells you immediately if it doesn't land on the closing figure. That one check catches the failure mode that matters most: a merged cell, a split line, or a footnote row misread as a transaction. Most PDF-to-Excel converters stop at "here's a table that looks right" and leave you to spot an off-by-one row by eye. This one tells you the math doesn't add up before you've sent a client's numbers anywhere.`,
  },
  {
    title: 'Exporting',
    body: `The table on screen is the same one that gets exported, in whatever shape you've set — one signed amount column or separate debit and credit columns, US or ISO dates, balance in or out. Excel exports come out as real numbers, not text that looks like numbers, so a SUM formula works without a find-and-replace pass first. CSV is there for anything that just wants rows. QuickBooks and Xero each expect their own column headers and date conventions for bank-feed import, so those are separate export buttons rather than a CSV you reshape by hand afterward.`,
  },
];

export function HowItWorks() {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <h2 className="font-heading text-xl font-semibold text-ink">How it works</h2>
      <div className="flex flex-col gap-5">
        {STEPS.map((step) => (
          <div key={step.title} className="flex flex-col gap-1.5">
            <h3 className="font-heading text-base font-medium text-ink">{step.title}</h3>
            <p className="text-sm leading-relaxed text-ink-muted">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
