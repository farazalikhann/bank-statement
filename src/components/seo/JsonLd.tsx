import { Head } from 'vite-react-ssg';

// A bare `<script type="application/ld+json">` wrapped in <Head> so it gets
// collected into the pre-rendered page's <head> alongside title/meta,
// instead of needing a separate rendering path. Structured data lives
// right next to the component whose visible content it describes, so the
// two can't quietly drift apart.
export function JsonLd({ data }: { data: object }) {
  return (
    <Head>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Head>
  );
}
