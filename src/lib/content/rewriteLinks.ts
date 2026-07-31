// Markdown content is written with plain root-relative links (`/blog/`,
// `/convert/chase-bank-statement-to-excel/`, `/`) since a slug's actual
// nesting depth isn't something a post author should have to think about.
// This rewrites those to sit under the app's real base path (e.g.
// `/bank-statement/`) after markdown-it has already turned them into
// `<a href="...">` tags. The negative lookahead skips protocol-relative
// URLs (`//example.com`) so only genuine root-relative links are touched.
export function rewriteInternalLinks(html: string): string {
  const base = import.meta.env.BASE_URL;
  if (base === '/') return html;
  return html.replace(/href="\/(?!\/)/g, `href="${base}`);
}
