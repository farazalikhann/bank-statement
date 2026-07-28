import { useCallback, useEffect, useState } from 'react';

interface UseVirtualRowsOptions {
  rowCount: number;
  rowHeight: number;
  overscan?: number;
}

// Fixed-row-height virtualization for a native <table>: renders only the
// rows in view (plus overscan) inside two spacer <tr>s, which is the
// standard way to virtualize an HTML table without breaking its layout
// (unlike absolute-positioned-div virtualizers, which assume you're not
// using <table> semantics at all).
export function useVirtualRows({
  rowCount,
  rowHeight,
  overscan = 6,
}: UseVirtualRowsOptions) {
  // A callback ref (not a plain useRef) so setup runs exactly when the
  // scroll container actually mounts into the DOM — the grid starts with
  // zero rows (before the first page's data seeds in), so the container
  // doesn't exist on the component's initial mount; a useEffect with an
  // empty dependency array would capture a null ref once and never retry.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    setContainer(el);
  }, []);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (!container) return;
    const measure = () => setViewportHeight(container.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  const onScroll = useCallback(() => {
    if (container) setScrollTop(container.scrollTop);
  }, [container]);

  const visibleCount =
    viewportHeight > 0 ? Math.ceil(viewportHeight / rowHeight) : rowCount;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(rowCount, startIndex + visibleCount + overscan * 2);

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (rowCount - endIndex) * rowHeight);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (!container) return;
      const targetTop = index * rowHeight;
      if (targetTop < container.scrollTop) {
        container.scrollTop = targetTop;
      } else if (targetTop + rowHeight > container.scrollTop + container.clientHeight) {
        container.scrollTop = targetTop + rowHeight - container.clientHeight;
      }
    },
    [container, rowHeight],
  );

  return {
    containerRef,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight,
    onScroll,
    scrollToIndex,
  };
}
