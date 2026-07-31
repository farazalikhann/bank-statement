import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { rewriteInternalLinks } from '../content/rewriteLinks';

export interface Post {
  title: string;
  slug: string;
  description: string;
  date: string;
  updated?: string;
  author: string;
  tags: string[];
  readingTime: string;
  html: string;
}

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

// Adding post #50 costs the same as post #2: drop a markdown file in
// /content/blog and rebuild. import.meta.glob is resolved at build time by
// Vite (both for the client bundle and for vite-react-ssg's Node-side
// render pass), so no file list or route needs to be hand-maintained here.
const rawModules = import.meta.glob('/content/blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function parsePost(raw: string, filePath: string): Post {
  const { data, content } = matter(raw);
  const required = ['title', 'slug', 'description', 'date', 'author', 'readingTime'] as const;
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Blog post ${filePath} is missing required frontmatter field "${field}"`);
    }
  }
  return {
    title: data.title,
    slug: data.slug,
    description: data.description,
    date: data.date,
    updated: data.updated,
    author: data.author,
    tags: Array.isArray(data.tags) ? data.tags : [],
    readingTime: data.readingTime,
    html: rewriteInternalLinks(md.render(content)),
  };
}

const allPostsNewestFirst: Post[] = Object.entries(rawModules)
  .map(([filePath, raw]) => parsePost(raw, filePath))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const allPostsOldestFirst: Post[] = [...allPostsNewestFirst].reverse();

export function getAllPosts(): Post[] {
  return allPostsNewestFirst;
}

export function getPostBySlug(slug: string): Post | undefined {
  return allPostsNewestFirst.find((post) => post.slug === slug);
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const post of allPostsNewestFirst) {
    for (const tag of post.tags) tags.add(tag);
  }
  return [...tags].sort();
}

export function getPostsByTag(tag: string): Post[] {
  return allPostsNewestFirst.filter((post) => post.tags.includes(tag));
}

// Same-tag posts, most shared tags first; ties broken by recency. Excludes
// the post itself.
export function getRelatedPosts(post: Post, limit = 3): Post[] {
  return allPostsNewestFirst
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      candidate,
      sharedTagCount: candidate.tags.filter((tag) => post.tags.includes(tag)).length,
    }))
    .filter((entry) => entry.sharedTagCount > 0)
    .sort((a, b) => b.sharedTagCount - a.sharedTagCount)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

// `previous` is the chronologically older post, `next` the newer one —
// the reading-order sense of "next", not index-list order.
export function getAdjacentPosts(slug: string): { previous: Post | null; next: Post | null } {
  const index = allPostsOldestFirst.findIndex((post) => post.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? allPostsOldestFirst[index - 1] : null,
    next: index < allPostsOldestFirst.length - 1 ? allPostsOldestFirst[index + 1] : null,
  };
}
