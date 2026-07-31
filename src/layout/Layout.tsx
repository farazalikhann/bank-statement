import { Outlet } from 'react-router-dom';
import { SiteHeader } from '../components/marketing/SiteHeader';
import { SiteFooter } from '../components/marketing/SiteFooter';

// Shared chrome for every routed page. Deliberately thin — each page keeps
// full control over its own <h1> and content width (a blog post reads
// better narrow; the tool table wants to be wide), so this only owns the
// header/footer and the outer page padding.
export function Layout() {
  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6">
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-8">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
