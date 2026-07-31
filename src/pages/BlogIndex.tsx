import { Seo } from '../components/seo/Seo';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { PostCard } from '../components/blog/PostCard';
import { getAllPosts, getAllTags } from '../lib/blog/posts';
import { siteHref } from '../lib/seo/siteConfig';

export function BlogIndex() {
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo
        title="Blog — StatementKit"
        description="Practical guides on importing bank statement PDFs into QuickBooks and Xero, reconciling accounts, and working with client statements safely."
        path="blog/"
      />
      <Breadcrumbs items={[{ label: 'Home', path: '' }, { label: 'Blog' }]} />

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">Blog</h1>
        <p className="text-sm text-ink-muted">
          Practical writing on bank statement PDFs — importing them into
          accounting software, reconciling them, and handling them safely.
        </p>
      </header>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <a
              key={tag}
              href={siteHref(`blog/tag/${tag}/`)}
              className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted hover:border-accent hover:text-accent"
            >
              {tag}
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}

export { BlogIndex as Component };
