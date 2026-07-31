import { Seo } from '../components/seo/Seo';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';

export function Privacy() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo
        title="Privacy Policy — StatementKit"
        description="StatementKit's privacy policy: your bank statement PDF is never uploaded or sent anywhere. Read exactly what is and isn't collected."
        path="privacy/"
      />
      <Breadcrumbs items={[{ label: 'Home', path: '' }, { label: 'Privacy Policy' }]} />

      <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
        Privacy Policy
      </h1>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink">
        <p className="text-ink-muted">Last updated: July 31, 2026</p>

        <p>
          The short version: your bank statement never leaves your device.
          Everything below is about the small amount of technical
          infrastructure around that fact, and the analytics that measure
          traffic to the site itself.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">
          What StatementKit does with your PDF
        </h2>
        <p>
          When you drop a PDF into StatementKit, it's read and parsed entirely
          by JavaScript running in your browser tab. There is no server that
          receives the file, no upload step, and no point at which the
          contents — account numbers, balances, transaction descriptions, any
          of it — travel over the network. If you disconnect from the
          internet before dropping a file, the tool still works, because it
          was never depending on a connection to process it. When you close
          the browser tab, whatever was extracted from that PDF is gone;
          nothing about it is saved anywhere outside that tab.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">What is collected</h2>
        <p>
          This site uses Google Analytics to understand traffic — which pages
          get visited, roughly how people arrive, and general usage patterns.
          Google Analytics runs by loading a script from Google's servers and
          reports standard web-analytics data (page views, referrers,
          approximate location from IP address, device/browser type) back to
          Google. It does not have access to anything inside a PDF you
          process — that parsing happens in a completely separate part of the
          page that never sends data anywhere, analytics included. See
          Google's own privacy policy for how it handles the data Analytics
          collects on its end. Beyond Analytics, this site runs no other
          tracking pixels or third-party scripts.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Cookies</h2>
        <p>
          Google Analytics sets its own cookies (typically named things like
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">_ga</code> and{' '}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">_ga_*</code>) to
          distinguish visitors between sessions. Outside of that, StatementKit
          itself sets no cookies — there's no login and no session of its own
          to remember.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Third-party services</h2>
        <p>
          Two outside services are involved in running this site: GitHub
          Pages, which hosts the static files (HTML, JavaScript, CSS) that
          make up StatementKit, and Google Analytics, described above. Like
          any web host, GitHub Pages' infrastructure keeps basic server logs
          of requests — IP address, requested file, timestamp — for
          operational and abuse-prevention purposes on their end. I don't
          have a dashboard into that data beyond what GitHub's own
          documentation describes; it isn't something StatementKit itself
          collects, stores, or has access to. No other third party — no ad
          network, no error-tracking service — is currently integrated into
          this site.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Your rights</h2>
        <p>
          Because no bank statement content or file data is collected by this
          site, there's nothing on my end to access, correct, or delete
          related to what you process. Google Analytics data is held by
          Google under its own retention settings, not by me directly; most
          browsers and ad-blockers can also block Analytics outright if you'd
          rather it not run at all — the PDF tool itself works identically
          either way. If you've emailed me directly (for support, a bug
          report, or anything else), I hold onto that email thread the way
          anyone's inbox does, and you're welcome to ask me to delete it at
          any time.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Payment</h2>
        <p>
          If StatementKit is sold as a paid product at the time you're
          reading this, payment is handled by a third-party payment processor
          at checkout, not by this site directly. That processor collects
          your card details and billing information under its own privacy
          policy — I never see or store your full card number, and this
          site's own infrastructure has no payment data to leak in the first
          place. Anything I do receive back (like an email address, for a
          receipt or license) is used only for that purpose.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Children</h2>
        <p>
          StatementKit isn't directed at children, and I don't knowingly
          collect information from anyone under 13. Given the site collects
          essentially nothing about you or your files to begin with, this is
          more a formality than a real scenario, but it's worth stating
          plainly.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Future ads</h2>
        <p>
          I plan to run Google AdSense on this site in the future to help
          cover hosting and ongoing development. When that happens, this
          policy will be updated first to describe the cookies and data
          collection that AdSense itself introduces — that hasn't happened
          yet, and no ad code is currently loaded on any page.
        </p>

        <h2 className="font-heading text-base font-semibold text-ink">Questions</h2>
        <p>
          If anything here is unclear, or you want to ask something this page
          doesn't answer, email{' '}
          <a href="mailto:farazalikhannnn@gmail.com" className="text-accent hover:underline">
            farazalikhannnn@gmail.com
          </a>
          . I'll answer personally.
        </p>
      </div>
    </div>
  );
}

export { Privacy as Component };
