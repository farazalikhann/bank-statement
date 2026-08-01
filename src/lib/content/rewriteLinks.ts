// Markdown content is written with plain root-relative links (`/blog/`,
// `/convert/chase-bank-statement-to-excel/`, `/`) since a slug's actual
// nesting depth isn't something a post author should have to think about.
// This rewrites those to sit under the app's real base path after
// markdown-it has already turned them into `<a href="...">` tags — a no-op
// today since the site is served from the domain root, but it means a
// future move back under a subpath (base !== '/') wouldn't 404 every
// internal content link. The negative lookahead skips protocol-relative
// URLs (`//example.com`) so only genuine root-relative links are touched.
export function rewriteInternalLinks(html: string): string {
  const base = import.meta.env.BASE_URL;
  if (base === '/') return html;
  return html.replace(/href="\/(?!\/)/g, `href="${base}`);
}
