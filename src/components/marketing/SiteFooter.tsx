const YEAR = new Date().getFullYear();
const BASE = import.meta.env.BASE_URL;

const LINKS = [
  { href: `${BASE}blog/`, label: 'Blog' },
  { href: `${BASE}convert/`, label: 'Convert' },
  { href: `${BASE}about/`, label: 'About' },
  { href: `${BASE}contact/`, label: 'Contact' },
  { href: `${BASE}privacy/`, label: 'Privacy Policy' },
  { href: `${BASE}terms/`, label: 'Terms' },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-muted">
      <p>
        Files never leave this device — all processing happens locally in
        your browser.
      </p>
      <nav className="flex flex-wrap gap-x-4 gap-y-1">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-accent hover:underline">
            {link.label}
          </a>
        ))}
      </nav>
      <p>&copy; {YEAR} Faraz Ali Khan.</p>
    </footer>
  );
}
