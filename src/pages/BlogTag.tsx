import { useParams } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { PostCard } from '../components/blog/PostCard';
import { getAllTags, getPostsByTag } from '../lib/blog/posts';
import { siteHref } from '../lib/seo/siteConfig';

export function BlogTag() {
  const { tag = '' } = useParams();
  const posts = getPostsByTag(tag);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Seo
        title={`Posts tagged "${tag}" — StatementKit Blog`}
        description={`All StatementKit blog posts tagged "${tag}".`}
        path={`blog/tag/${tag}/`}
      />
      <Breadcrumbs
        items={[
          { label: 'Home', path: '' },
          { label: 'Blog', path: 'blog/' },
          { label: tag },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">
          Posts tagged &ldquo;{tag}&rdquo;
        </h1>
        <p className="text-sm text-ink-muted">
          <a href={siteHref('blog/')} className="text-accent hover:underline">
            All posts
          </a>
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-ink-muted">No posts with this tag yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

export function getStaticPaths() {
  return getAllTags().map((tag) => `blog/tag/${tag}`);
}

export { BlogTag as Component };
