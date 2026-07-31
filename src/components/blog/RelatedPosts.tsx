import type { Post } from '../../lib/blog/posts';
import { siteHref } from '../../lib/seo/siteConfig';

export function RelatedPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="related-posts-heading" className="flex flex-col gap-3 border-t border-line pt-6">
      <h2 id="related-posts-heading" className="font-heading text-base font-semibold text-ink">
        Related reading
      </h2>
      <ul className="flex flex-col gap-2">
        {posts.map((post) => (
          <li key={post.slug}>
            <a
              href={siteHref(`blog/${post.slug}/`)}
              className="text-sm font-medium text-accent hover:underline"
            >
              {post.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
