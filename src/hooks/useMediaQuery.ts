import { useEffect, useState } from 'react';

// Drives an actual conditional *mount* (not CSS show/hide) so the desktop
// grid and the mobile views are never both mounted — important here since
// the desktop grid owns its own virtualized-scroll state that shouldn't run
// (or fight for the same rowId-keyed refs) while hidden.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handleChange = () => setMatches(mql.matches);
    handleChange();
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
