import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { rewriteInternalLinks } from '../content/rewriteLinks';

export interface Bank {
  name: string;
  slug: string;
  description: string;
  dateFormat: string;
  columnLayout: string;
  html: string;
}

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

// Same pattern as src/lib/blog/posts.ts: one markdown file per bank in
// /content/banks, picked up automatically at build time. A bank with
// nothing genuinely distinct to say about its statement format simply
// doesn't get a file — there's no data-table entry to fill in "just to
// have one," which is what keeps these from becoming thin templated pages.
const rawModules = import.meta.glob('/content/banks/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function parseBank(raw: string, filePath: string): Bank {
  const { data, content } = matter(raw);
  const required = ['name', 'slug', 'description', 'dateFormat', 'columnLayout'] as const;
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Bank page ${filePath} is missing required frontmatter field "${field}"`);
    }
  }
  return {
    name: data.name,
    slug: data.slug,
    description: data.description,
    dateFormat: data.dateFormat,
    columnLayout: data.columnLayout,
    html: rewriteInternalLinks(md.render(content)),
  };
}

const allBanks: Bank[] = Object.entries(rawModules)
  .map(([filePath, raw]) => parseBank(raw, filePath))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getAllBanks(): Bank[] {
  return allBanks;
}

export function getBankBySlug(slug: string): Bank | undefined {
  return allBanks.find((bank) => bank.slug === slug);
}
