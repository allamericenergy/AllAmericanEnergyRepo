import { useVirtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";

interface UseGridVirtualizerProps {
  count: number;
  rowHeight: number;
  parentRef: RefObject<HTMLElement | null>;
}

export function useGridVirtualizer({
  count,
  rowHeight,
  parentRef,
}: UseGridVirtualizerProps) {
  return useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });
}