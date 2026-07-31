import type { RouteRecord } from 'vite-react-ssg';
import { Layout } from './layout/Layout';

// Every page is loaded via `lazy` rather than a static import so each
// route's JS (and, per the vite-react-ssg README, its `getStaticPaths` for
// dynamic routes) is code-split into its own chunk — a blog post doesn't
// need to ship the PDF tool's code, and vice versa. Dynamic routes
// (blog/:slug, blog/tag/:tag, convert/:bank) get their getStaticPaths from
// an export in the page module itself; see each page file.
export const routes: RouteRecord[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, lazy: () => import('./pages/Home'), entry: 'src/pages/Home.tsx' },
      { path: 'about', lazy: () => import('./pages/About'), entry: 'src/pages/About.tsx' },
      { path: 'contact', lazy: () => import('./pages/Contact'), entry: 'src/pages/Contact.tsx' },
      { path: 'privacy', lazy: () => import('./pages/Privacy'), entry: 'src/pages/Privacy.tsx' },
      { path: 'terms', lazy: () => import('./pages/Terms'), entry: 'src/pages/Terms.tsx' },
      { path: 'blog', lazy: () => import('./pages/BlogIndex'), entry: 'src/pages/BlogIndex.tsx' },
      {
        path: 'blog/tag/:tag',
        lazy: () => import('./pages/BlogTag'),
        entry: 'src/pages/BlogTag.tsx',
      },
      {
        path: 'blog/:slug',
        lazy: () => import('./pages/BlogPost'),
        entry: 'src/pages/BlogPost.tsx',
      },
      {
        path: 'convert',
        lazy: () => import('./pages/ConvertIndex'),
        entry: 'src/pages/ConvertIndex.tsx',
      },
      {
        path: 'convert/:bank',
        lazy: () => import('./pages/BankPage'),
        entry: 'src/pages/BankPage.tsx',
      },
      { path: '*', lazy: () => import('./pages/NotFound'), entry: 'src/pages/NotFound.tsx' },
    ],
  },
];
