import { Seo } from '../components/seo/Seo';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { getAllBanks } from '../lib/banks/banks';
import { siteHref } from '../lib/seo/siteConfig';

export function ConvertIndex() {
  const banks = getAllBanks();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo
        title="Convert Bank Statements to Excel & CSV — StatementKit"
        description="Bank-by-bank guides for converting statement PDFs to Excel and CSV, covering date formats, column layout, and common formatting quirks."
        path="convert/"
      />
      <Breadcrumbs items={[{ label: 'Home', path: '' }, { label: 'Convert' }]} />

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
          Convert your bank's statement PDF
        </h1>
        <p className="text-sm text-ink-muted">
          StatementKit doesn't hard-code per-bank layouts — it reads column
          positions from whitespace, which is why it works on any bank's PDF.
          These pages cover what each bank's statement actually looks like,
          so you know what to expect before you convert one.
        </p>
      </header>

      <ul className="flex flex-col divide-y divide-line">
        {banks.map((bank) => (
          <li key={bank.slug} className="py-3">
            <a
              href={siteHref(`convert/${bank.slug}/`)}
              className="font-heading text-base font-medium text-ink hover:text-accent hover:underline"
            >
              {bank.name}
            </a>
            <p className="text-sm text-ink-muted">{bank.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { ConvertIndex as Component };
