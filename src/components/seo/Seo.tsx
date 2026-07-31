import type { ReactNode } from 'react';
import { Head } from 'vite-react-ssg';
import { SITE_NAME, canonicalUrl } from '../../lib/seo/siteConfig';

interface SeoProps {
  // Full <title> text, including the site name suffix — kept explicit per
  // page (rather than auto-appended) so each page controls its own title
  // exactly, the same way the pre-SSG static pages already did.
  title: string;
  description: string;
  // Path relative to the app base, no leading slash — see canonicalUrl().
  path: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  children?: ReactNode;
}

// Every routed page renders exactly one of these — it's the only place
// <title>, meta description, canonical, and Open Graph/Twitter tags get
// set, so there's one source of truth per page instead of values drifting
// between what's visible and what a crawler reads.
export function Seo({ title, description, path, type = 'website', noindex, children }: SeoProps) {
  const url = canonicalUrl(path);

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {children}
    </Head>
  );
}
