import type { Post } from '../../lib/blog/posts';
import { formatDate } from '../../lib/blog/format';
import { siteHref } from '../../lib/seo/siteConfig';

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="flex flex-col gap-1.5 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h2 className="font-heading text-lg font-medium text-ink">
        <a href={siteHref(`blog/${post.slug}/`)} className="hover:text-accent hover:underline">
          {post.title}
        </a>
      </h2>
      <p className="text-sm leading-relaxed text-ink-muted">{post.description}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span aria-hidden="true">&middot;</span>
        <span>{post.readingTime}</span>
        {post.tags.map((tag) => (
          <a
            key={tag}
            href={siteHref(`blog/tag/${tag}/`)}
            className="rounded-full border border-line px-2 py-0.5 hover:border-accent hover:text-accent"
          >
            {tag}
          </a>
        ))}
      </div>
    </article>
  );
}
