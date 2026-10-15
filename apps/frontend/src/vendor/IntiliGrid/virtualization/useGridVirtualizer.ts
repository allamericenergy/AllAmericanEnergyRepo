import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { calculateVirtualRange } from "./GridVirtualizer";

interface UseGridVirtualizerOptions {
    rowCount: number;
    rowHeight?: number;
    overscan?: number;
}

export function useGridVirtualizer({
    rowCount,
    rowHeight = 44,
    overscan = 8,
}: UseGridVirtualizerOptions) {
    const containerRef =
        useRef<HTMLDivElement | null>(null);

    const [scrollTop, setScrollTop] =
        useState(0);

    const [viewportHeight, setViewportHeight] =
        useState(0);

    useEffect(() => {
        const element = containerRef.current;

        if (!element) {
            return;
        }

        function updateSize() {
            setViewportHeight(
                element?.clientHeight ?? 0
            );
        }

        updateSize();

        const resizeObserver =
            new ResizeObserver(updateSize);

        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    function handleScroll() {
        const element = containerRef.current;

        if (!element) {
            return;
        }

        setScrollTop(element.scrollTop);
    }

    const range = useMemo(
        () =>
            calculateVirtualRange({
                rowCount,
                rowHeight,
                viewportHeight,
                scrollTop,
                overscan,
            }),
        [
            rowCount,
            rowHeight,
            viewportHeight,
            scrollTop,
            overscan,
        ]
    );

    function scrollToIndex(index: number) {
        const element = containerRef.current;

        if (!element) {
            return;
        }

        element.scrollTo({
            top: index * rowHeight,
            behavior: "smooth",
        });
    }
    return {
        containerRef,
        handleScroll,
        range,
        rowHeight,
        scrollToIndex,
    };
}