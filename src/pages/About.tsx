import { Seo } from '../components/seo/Seo';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';

export function About() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo
        title="About — StatementKit"
        description="Who built StatementKit and why — a one-person tool for converting bank statement PDFs to Excel and CSV without uploading them anywhere."
        path="about/"
      />
      <Breadcrumbs items={[{ label: 'Home', path: '' }, { label: 'About' }]} />

      <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">About</h1>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink">
        <p>I'm Faraz Ali Khan, and I built StatementKit by myself, working out of India.</p>

        <p>
          The idea came from watching how much of "bookkeeping" is actually
          just retyping. A friend who does books for a handful of small
          businesses showed me her routine at the start of every month: open a
          client's bank statement PDF, open a blank spreadsheet, and go line
          by line, transaction by transaction, checking the running balance by
          eye every few rows to make sure she hadn't fat-fingered a number.
          For clients with two or three accounts, that was hours before she'd
          done a single hour of actual bookkeeping.
        </p>

        <p>
          I write software for a living, and reading a PDF's text positions
          programmatically is a solved problem — pdf.js, the same engine
          Firefox uses to render PDFs in your browser, exposes exactly that.
          What was missing wasn't the technology, it was someone building the
          specific thing: a tool that reads a bank statement, checks its own
          arithmetic against the balances printed on the page, and hands back
          a spreadsheet — without asking anyone to trust a server with an
          account number they've never met.
        </p>

        <p>
          That last part mattered more the longer I worked on it. A bank
          statement is one of the more sensitive documents a person has. I
          didn't want to build something that needed a privacy policy
          promising good behavior — I wanted to build something where the
          good behavior was structural, because there's no server in the loop
          to misbehave. That's not a compliance decision. It's the reason
          this exists as a browser tool instead of an upload-and-wait
          service.
        </p>

        <p>
          StatementKit is still a small, one-person product, and I'd rather it
          stay narrow and reliable than grow into something that tries to do
          everything. Right now that means better handling for the messier
          statement layouts people send in, and the QuickBooks/Xero export
          formats bookkeepers actually asked for — not a roadmap of unrelated
          features bolted on to look impressive.
        </p>

        <p>
          If something breaks on your statement, a column gets misread, or an
          export doesn't import cleanly into your accounting software, email
          me directly. There's no support ticket system and no chatbot in
          between — I read every message myself, and since I'm also the one
          who wrote the parsing code, I'm usually the person who can actually
          fix it.
        </p>
      </div>
    </div>
  );
}

export { About as Component };
