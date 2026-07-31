import { Seo } from '../components/seo/Seo';
import { siteHref } from '../lib/seo/siteConfig';

export function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Seo title="Page not found — StatementKit" description="This page doesn't exist." path="404/" noindex />
      <h1 className="font-heading text-2xl font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-ink-muted">
        <a href={siteHref('')} className="text-accent hover:underline">
          Back to StatementKit
        </a>
      </p>
    </div>
  );
}

export { NotFound as Component };
