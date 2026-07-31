const BASE = import.meta.env.BASE_URL;

const NAV_LINKS = [
  { href: `${BASE}blog/`, label: 'Blog' },
  { href: `${BASE}convert/`, label: 'Convert' },
];

// Plain site wordmark/nav, deliberately not an <h1> — every routed page
// supplies its own single <h1> for its own topic (the tool's on the
// homepage, a post title on a blog page, a bank name on a /convert/ page),
// and this header is shared chrome across all of them.
export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line pb-4">
      <a href={BASE} className="font-heading text-xl font-semibold tracking-tight text-ink">
        StatementKit
      </a>
      <nav className="flex gap-4 text-sm font-medium text-ink-muted">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-accent hover:underline">
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
