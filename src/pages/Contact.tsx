import { Seo } from '../components/seo/Seo';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';

export function Contact() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo
        title="Contact — StatementKit"
        description="Get in touch about StatementKit — a bank statement PDF to Excel/CSV converter. Email goes directly to the person who built and maintains it."
        path="contact/"
      />
      <Breadcrumbs items={[{ label: 'Home', path: '' }, { label: 'Contact' }]} />

      <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">Contact</h1>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink">
        <p>
          Email:{' '}
          <a href="mailto:farazalikhannnn@gmail.com" className="text-accent hover:underline">
            farazalikhannnn@gmail.com
          </a>
        </p>

        <p>
          I usually reply within 24 hours. If you're writing about a statement
          that parsed incorrectly, mentioning the bank and roughly which row
          was wrong helps me fix it faster.
        </p>

        <p>This isn't a support form — it's just my inbox.</p>
      </div>
    </div>
  );
}

export { Contact as Component };
