import { Seo } from '../components/seo/Seo';
import { JsonLd } from '../components/seo/JsonLd';
import { ConversionTool } from '../components/ConversionTool';

// Kept word-for-word identical to src/components/marketing/Faq.tsx's visible
// text — this schema is only valid for rich results if it matches what a
// visitor actually reads on the page.
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is my bank statement uploaded anywhere?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. There's no server in this product to upload it to. The PDF is opened and parsed by JavaScript running in your browser tab, and the resulting spreadsheet is generated and downloaded the same way. You can disconnect from the internet before dropping the file and it will still work exactly the same.",
      },
    },
    {
      '@type': 'Question',
      name: 'Which banks are supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "StatementKit doesn't hard-code layouts for specific banks. It reads the position of text on the page and works out columns from whitespace, which is why it handles statements from banks it's never seen before. Very unusual layouts — rotated text, statements built as images of a table — can still trip it up.",
      },
    },
    {
      '@type': 'Question',
      name: 'What if the tool misreads a number?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Every cell it's unsure about gets flagged, and you can click any cell to correct it directly in the table before exporting — the fix is applied immediately, and undo/redo is available if you change your mind. The balance check also tells you if a wrong row leaves the running total off.",
      },
    },
    {
      '@type': 'Question',
      name: 'Does it work on scanned statements?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Only if the PDF has an actual text layer underneath — most bank-generated statements do. A scanned image with no embedded text has nothing for a browser to read as characters, so StatementKit will tell you it found no text rather than guess at numbers from pixels.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I export to QuickBooks or Xero?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Alongside plain CSV and Excel, there are dedicated export buttons that format the file with the column headers and date conventions each platform expects for a bank-feed import, so you're not manually reshaping a generic CSV before it'll import cleanly.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a file size limit?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No hard limit is enforced, but performance depends on your own device, since all parsing happens in your browser rather than on a server built for the job. A typical monthly statement of a few pages processes in a couple of seconds; very long multi-year PDFs will take longer.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does it work offline?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, once the page itself has loaded. After that, opening a PDF, checking the balance, and exporting a file all happen locally, with nothing going out over the network. Turning off WiFi and dropping a file in is a legitimate way to confirm that for yourself.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the balance verification work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You enter the opening and closing balance printed on the statement. StatementKit then adds up every transaction in order, starting from the opening figure, and compares the running total after the last row to the closing figure you entered, flagging the exact row where the math first stops lining up.',
      },
    },
  ],
};

export function Home() {
  return (
    <>
      <Seo
        title="StatementKit — Bank Statement PDF to CSV & Excel Converter"
        description="Convert bank statement PDFs into clean Excel and CSV files entirely in your browser. No upload, no server — built for bookkeepers, accountants, and mortgage brokers."
        path=""
      />
      <JsonLd data={FAQ_JSON_LD} />

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
          StatementKit
        </h1>
        <p className="text-sm text-ink-muted">
          Convert bank statement PDFs into clean, structured data — entirely
          in your browser. Nothing is uploaded.
        </p>
      </header>

      <ConversionTool />
    </>
  );
}

export { Home as Component };
