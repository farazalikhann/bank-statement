import { useParams } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { JsonLd } from '../components/seo/JsonLd';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { ConversionTool } from '../components/ConversionTool';
import { getAllBanks, getBankBySlug } from '../lib/banks/banks';
import { getAllPosts } from '../lib/blog/posts';
import { siteHref } from '../lib/seo/siteConfig';

// Deterministic per-bank pick of the 2 posts it links to (Part 5's internal
// linking requirement), spread across the post list by slug so 15 bank
// pages don't all point at the same two posts.
function pickRelatedPosts(slug: string, count: number) {
  const posts = getAllPosts();
  if (posts.length === 0) return [];
  const hash = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const picks = [];
  for (let i = 0; i < Math.min(count, posts.length); i++) {
    picks.push(posts[(hash + i) % posts.length]);
  }
  return picks;
}

export function BankPage() {
  const { bank: slug = '' } = useParams();
  const bank = getBankBySlug(slug);

  if (!bank) {
    return (
      <div className="flex flex-col gap-4">
        <Seo title="Bank not found — StatementKit" description="This page doesn't exist." path={`convert/${slug}/`} noindex />
        <h1 className="font-heading text-2xl font-semibold text-ink">Page not found</h1>
        <p className="text-sm text-ink-muted">
          <a href={siteHref('convert/')} className="text-accent hover:underline">
            See all supported banks
          </a>
        </p>
      </div>
    );
  }

  const path = `convert/${bank.slug}/`;
  const relatedPosts = pickRelatedPosts(bank.slug, 2);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <Seo
        title={`${bank.name} Statement PDF to Excel & CSV — StatementKit`}
        description={bank.description}
        path={path}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: `How to convert a ${bank.name} statement PDF to Excel or CSV`,
          description: bank.description,
          step: [
            { '@type': 'HowToStep', text: `Download your ${bank.name} statement as a PDF from online banking.` },
            { '@type': 'HowToStep', text: 'Drop the PDF into the converter below — it stays on your device.' },
            { '@type': 'HowToStep', text: 'Check the reconciled balance, then export to Excel, CSV, QuickBooks, or Xero.' },
          ],
        }}
      />
      <Breadcrumbs
        items={[
          { label: 'Home', path: '' },
          { label: 'Convert', path: 'convert/' },
          { label: bank.name },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
          Convert a {bank.name} statement PDF to Excel or CSV
        </h1>
        <p className="text-sm text-ink-muted">{bank.description}</p>
        <dl className="mt-1 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-ink-muted sm:grid-cols-2">
          <div className="flex gap-1">
            <dt className="font-medium text-ink">Date format:</dt>
            <dd>{bank.dateFormat}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-medium text-ink">Column layout:</dt>
            <dd>{bank.columnLayout}</dd>
          </div>
        </dl>
      </header>

      <div className="rounded-md border border-line bg-surface p-4">
        <ConversionTool
          showLandingContent={false}
          prompt={`Drop your ${bank.name} statement PDF here`}
        />
      </div>

      {/* eslint-disable-next-line react/no-danger -- bank.html is our own markdown, rendered at build time, not user input */}
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: bank.html }} />

      {relatedPosts.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="font-heading text-base font-semibold text-ink">Related reading</h2>
          <ul className="flex flex-col gap-2">
            {relatedPosts.map((post) => (
              <li key={post.slug}>
                <a href={siteHref(`blog/${post.slug}/`)} className="text-sm font-medium text-accent hover:underline">
                  {post.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function getStaticPaths() {
  return getAllBanks().map((bank) => `convert/${bank.slug}`);
}

export { BankPage as Component };
