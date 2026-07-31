// Kept word-for-word identical to the FAQPage JSON-LD in index.html — that
// schema is only valid for rich results if it matches what's actually
// visible on the page.
const FAQS = [
  {
    q: 'Is my bank statement uploaded anywhere?',
    a: `No. There's no server in this product to upload it to. The PDF is opened and parsed by JavaScript running in your browser tab, and the resulting spreadsheet is generated and downloaded the same way. You can disconnect from the internet before dropping the file and it will still work exactly the same.`,
  },
  {
    q: 'Which banks are supported?',
    a: `StatementKit doesn't hard-code layouts for specific banks. It reads the position of text on the page and works out columns from whitespace, which is why it handles statements from banks it's never seen before. Very unusual layouts — rotated text, statements built as images of a table — can still trip it up.`,
  },
  {
    q: 'What if the tool misreads a number?',
    a: `Every cell it's unsure about gets flagged, and you can click any cell to correct it directly in the table before exporting — the fix is applied immediately, and undo/redo is available if you change your mind. The balance check also tells you if a wrong row leaves the running total off.`,
  },
  {
    q: 'Does it work on scanned statements?',
    a: `Only if the PDF has an actual text layer underneath — most bank-generated statements do. A scanned image with no embedded text has nothing for a browser to read as characters, so StatementKit will tell you it found no text rather than guess at numbers from pixels.`,
  },
  {
    q: 'Can I export to QuickBooks or Xero?',
    a: `Yes. Alongside plain CSV and Excel, there are dedicated export buttons that format the file with the column headers and date conventions each platform expects for a bank-feed import, so you're not manually reshaping a generic CSV before it'll import cleanly.`,
  },
  {
    q: 'Is there a file size limit?',
    a: `No hard limit is enforced, but performance depends on your own device, since all parsing happens in your browser rather than on a server built for the job. A typical monthly statement of a few pages processes in a couple of seconds; very long multi-year PDFs will take longer.`,
  },
  {
    q: 'Does it work offline?',
    a: `Yes, once the page itself has loaded. After that, opening a PDF, checking the balance, and exporting a file all happen locally, with nothing going out over the network. Turning off WiFi and dropping a file in is a legitimate way to confirm that for yourself.`,
  },
  {
    q: 'How does the balance verification work?',
    a: `You enter the opening and closing balance printed on the statement. StatementKit then adds up every transaction in order, starting from the opening figure, and compares the running total after the last row to the closing figure you entered, flagging the exact row where the math first stops lining up.`,
  },
];

export function Faq() {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <h2 className="font-heading text-xl font-semibold text-ink">Frequently asked questions</h2>
      <div className="flex flex-col divide-y divide-line">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-3">
            <summary className="cursor-pointer list-none font-heading text-sm font-medium text-ink marker:content-none">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <span aria-hidden="true" className="text-ink-muted group-open:hidden">
                  +
                </span>
                <span aria-hidden="true" className="hidden text-ink-muted group-open:inline">
                  &minus;
                </span>
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
