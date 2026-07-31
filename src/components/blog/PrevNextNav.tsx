import type { Post } from '../../lib/blog/posts';
import { siteHref } from '../../lib/seo/siteConfig';

export function PrevNextNav({ previous, next }: { previous: Post | null; next: Post | null }) {
  if (!previous && !next) return null;

  return (
    <nav aria-label="More posts" className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
      <div>
        {previous && (
          <a href={siteHref(`blog/${previous.slug}/`)} className="group flex flex-col gap-0.5">
            <span className="text-xs text-ink-muted">&larr; Previous</span>
            <span className="text-sm font-medium text-ink group-hover:text-accent group-hover:underline">
              {previous.title}
            </span>
          </a>
        )}
      </div>
      <div className="sm:text-right">
        {next && (
          <a href={siteHref(`blog/${next.slug}/`)} className="group flex flex-col gap-0.5">
            <span className="text-xs text-ink-muted">Next &rarr;</span>
            <span className="text-sm font-medium text-ink group-hover:text-accent group-hover:underline">
              {next.title}
            </span>
          </a>
        )}
      </div>
    </nav>
  );
}
