export const SITE_NAME = 'StatementKit';
export const SITE_ORIGIN = 'https://statementkit.work';
export const AUTHOR_NAME = 'Faraz Ali Khan';

// `path` is relative to the app base (e.g. '' for home, 'about/',
// 'blog/my-post/') and must not start with a slash — every internal link
// and canonical tag in the site builds off this one function so the origin,
// base path, and trailing-slash convention can never drift apart between
// pages.
export function canonicalUrl(path: string = ''): string {
  const base = import.meta.env.BASE_URL;
  return `${SITE_ORIGIN}${base}${path}`;
}

export function siteHref(path: string = ''): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
