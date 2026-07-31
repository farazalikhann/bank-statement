import { canonicalUrl, siteHref } from '../../lib/seo/siteConfig';
import { JsonLd } from './JsonLd';

export interface Crumb {
  label: string;
  // Path relative to the app base, no leading slash. Omitted on the last
  // crumb (the current page), which renders as plain text instead of a
  // link.
  path?: string;
}

// Renders the visible breadcrumb trail AND its BreadcrumbList JSON-LD from
// the same list of crumbs, the same way JsonLd's own doc comment describes
// for the FAQ block — one is what a visitor reads, the other is what a
// crawler reads, and they have to agree.
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const listItems = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    ...(item.path !== undefined ? { item: canonicalUrl(item.path) } : {}),
  }));

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: listItems,
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, index) => (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.path !== undefined ? (
                <a href={siteHref(item.path)} className="hover:text-accent hover:underline">
                  {item.label}
                </a>
              ) : (
                <span aria-current="page" className="text-ink">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
