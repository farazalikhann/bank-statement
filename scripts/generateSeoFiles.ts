import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

// Kept in sync by hand with vite.config.ts's `base` and
// src/lib/seo/siteConfig.ts's SITE_ORIGIN — this script runs as plain Node
// during vite-react-ssg's onFinished hook, outside Vite's module graph, so
// it can't import.meta.glob the content directory or read import.meta.env
// the way the app itself does; it reads the same markdown files directly
// off disk instead.
const SITE_ORIGIN = 'https://statementkit.work';
const BASE = '/';

function readSlugsAndTags(dir: string) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const slugs: string[] = [];
  const tagSet = new Set<string>();
  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    const { data } = matter(raw);
    if (data.slug) slugs.push(data.slug);
    if (Array.isArray(data.tags)) for (const tag of data.tags) tagSet.add(tag);
  }
  return { slugs, tags: [...tagSet] };
}

// Generates sitemap.xml + robots.txt into the built `dist` directory,
// listing every static route plus every dynamically-generated blog post,
// tag page, and bank page — so a new markdown file shows up in the sitemap
// on the next build with no route list to hand-maintain here.
export function generateSeoFiles(outDir: string, contentRoot: string) {
  const posts = readSlugsAndTags(join(contentRoot, 'blog'));
  const banks = readSlugsAndTags(join(contentRoot, 'banks'));

  const routes = [
    '',
    'about/',
    'contact/',
    'privacy/',
    'terms/',
    'blog/',
    'convert/',
    ...posts.slugs.map((slug) => `blog/${slug}/`),
    ...posts.tags.map((tag) => `blog/tag/${tag}/`),
    ...banks.slugs.map((slug) => `convert/${slug}/`),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const urlEntries = routes
    .map(
      (route) =>
        `  <url>\n    <loc>${SITE_ORIGIN}${BASE}${route}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
    )
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
  writeFileSync(join(outDir, 'sitemap.xml'), sitemap);

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}${BASE}sitemap.xml\n`;
  writeFileSync(join(outDir, 'robots.txt'), robots);

  console.log(`[seo] Wrote sitemap.xml with ${routes.length} URLs and robots.txt`);
}
