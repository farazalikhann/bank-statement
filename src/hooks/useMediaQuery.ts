import { useEffect, useState } from 'react';

// Drives an actual conditional *mount* (not CSS show/hide) so the desktop
// grid and the mobile views are never both mounted — important here since
// the desktop grid owns its own virtualized-scroll state that shouldn't run
// (or fight for the same rowId-keyed refs) while hidden.
export function useMediaQuery(query: string): boolean {
  // Guarded for SSG: this hook renders once in Node during static
  // pre-rendering, where `window` doesn't exist. False is a safe default
  // there — the real value is picked up immediately by the effect below
  // once the page hydrates in an actual browser.
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handleChange = () => setMatches(mql.matches);
    handleChange();
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
