import { Seo } from '../components/seo/Seo';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';

export function Terms() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo
        title="Terms — StatementKit"
        description="Terms of use for StatementKit, a browser-based bank statement PDF to Excel/CSV converter."
        path="terms/"
      />
      <Breadcrumbs items={[{ label: 'Home', path: '' }, { label: 'Terms' }]} />

      <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">Terms</h1>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink">
        <p className="text-ink-muted">Last updated: July 30, 2026</p>

        <p>
          These are the terms for using StatementKit, a browser-based tool
          that converts bank statement PDFs into spreadsheet exports. By
          using the site, you agree to them.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Acceptable use</h2>
        <p>
          Use StatementKit for your own statements, or for statements you're
          authorized to process on someone else's behalf — as a bookkeeper,
          accountant, or broker normally is for a client. Don't use it to
          process documents you don't have the right to access, and don't
          attempt to disrupt the site, scrape it at a scale that degrades it
          for others, or reverse-engineer it for the purpose of building a
          competing paid product from the output.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">
          No warranty on parsing accuracy
        </h2>
        <p>
          This is the important one: StatementKit is provided as a tool to
          speed up a manual process, not as a guarantee of accuracy. Bank
          statement layouts vary enormously, and a column can be misdetected,
          a row can be misread, or an edge case in a particular bank's
          formatting can produce a wrong number. The balance-verification
          feature exists specifically to help you catch this, but it is not
          a substitute for reviewing your own output. You are responsible for
          checking exported data before you file it, submit it, or hand it to
          a client. StatementKit is provided "as is," without any warranty —
          express or implied — regarding the accuracy, completeness, or
          fitness for any particular purpose of anything it produces.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Refunds</h2>
        <p>
          If you purchased StatementKit and it doesn't work for you, email me
          within 7 days of purchase and you'll get a full refund, no
          questions asked. I'd rather refund a sale than have someone stuck
          with a tool that didn't fit their workflow.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">
          Limitation of liability
        </h2>
        <p>
          To the extent permitted by law, I'm not liable for indirect,
          incidental, or consequential damages arising from your use of
          StatementKit, including errors in exported financial data or
          decisions made based on it. Because nothing you process ever
          reaches a server I control, my ability to inspect or reproduce an
          issue after the fact is limited to what you can show me directly —
          a screenshot, the original PDF, or a description of which row
          looked wrong is genuinely the fastest way to get a fix.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Changes</h2>
        <p>
          I may update these terms as the product changes. Continuing to use
          StatementKit after an update means you accept the current version,
          which will always be posted at this address.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Governing law</h2>
        <p>
          These terms are governed by the laws of India, without regard to
          its conflict-of-law principles.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Contact</h2>
        <p>
          Questions about these terms:{' '}
          <a href="mailto:farazalikhannnn@gmail.com" className="text-accent hover:underline">
            farazalikhannnn@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export { Terms as Component };
