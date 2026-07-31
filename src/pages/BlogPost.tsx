import { useParams } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { JsonLd } from '../components/seo/JsonLd';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { RelatedPosts } from '../components/blog/RelatedPosts';
import { PrevNextNav } from '../components/blog/PrevNextNav';
import { formatDate } from '../lib/blog/format';
import { getAllPosts, getPostBySlug, getRelatedPosts, getAdjacentPosts } from '../lib/blog/posts';
import { getAllBanks } from '../lib/banks/banks';
import { canonicalUrl, siteHref } from '../lib/seo/siteConfig';

// Deterministic so the same post always links to the same bank page across
// rebuilds, but spread across the bank list by slug rather than by list
// position (position would shift as posts are added/removed over time).
function pickRelatedBank(slug: string) {
  const banks = getAllBanks();
  if (banks.length === 0) return null;
  const hash = [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return banks[hash % banks.length];
}

export function BlogPost() {
  const { slug = '' } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <div className="flex flex-col gap-4">
        <Seo title="Post not found — StatementKit" description="This post doesn't exist." path={`blog/${slug}/`} noindex />
        <h1 className="font-heading text-2xl font-semibold text-ink">Post not found</h1>
        <p className="text-sm text-ink-muted">
          <a href={siteHref('blog/')} className="text-accent hover:underline">
            Back to the blog
          </a>
        </p>
      </div>
    );
  }

  const related = getRelatedPosts(post);
  const { previous, next } = getAdjacentPosts(post.slug);
  const relatedBank = pickRelatedBank(post.slug);
  const path = `blog/${post.slug}/`;

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo title={`${post.title} — StatementKit`} description={post.description} path={path} type="article" />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.updated ?? post.date,
          author: { '@type': 'Person', name: post.author },
          mainEntityOfPage: canonicalUrl(path),
        }}
      />
      <Breadcrumbs
        items={[
          { label: 'Home', path: '' },
          { label: 'Blog', path: 'blog/' },
          { label: post.title },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span>{post.author}</span>
          <span aria-hidden="true">&middot;</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{post.readingTime}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <a
              key={tag}
              href={siteHref(`blog/tag/${tag}/`)}
              className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted hover:border-accent hover:text-accent"
            >
              {tag}
            </a>
          ))}
        </div>
      </header>

      {/* eslint-disable-next-line react/no-danger -- post.html is our own markdown, rendered at build time, not user input */}
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: post.html }} />

      {relatedBank && (
        <p className="border-t border-line pt-6 text-sm text-ink-muted">
          Working with {relatedBank.name} statements specifically? See{' '}
          <a href={siteHref(`convert/${relatedBank.slug}/`)} className="text-accent hover:underline">
            converting a {relatedBank.name} statement to Excel
          </a>
          .
        </p>
      )}

      <RelatedPosts posts={related} />
      <PrevNextNav previous={previous} next={next} />
    </article>
  );
}

export function getStaticPaths() {
  return getAllPosts().map((post) => `blog/${post.slug}`);
}

export { BlogPost as Component };
