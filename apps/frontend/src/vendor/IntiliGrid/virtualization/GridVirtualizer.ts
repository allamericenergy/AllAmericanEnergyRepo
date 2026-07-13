export interface GridVirtualRange {
    startIndex: number;
    endIndex: number;
    offsetTop: number;
    totalHeight: number;
}

export interface GridVirtualizerOptions {
    rowCount: number;
    rowHeight: number;
    viewportHeight: number;
    scrollTop: number;
    overscan?: number;
}

export function calculateVirtualRange({
    rowCount,
    rowHeight,
    viewportHeight,
    scrollTop,
    overscan = 5,
}: GridVirtualizerOptions): GridVirtualRange {
    const totalHeight = rowCount * rowHeight;

    const visibleStart = Math.floor(
        scrollTop / rowHeight
    );

    const visibleEnd = Math.ceil(
        (scrollTop + viewportHeight) / rowHeight
    );

    const startIndex = Math.max(
        0,
        visibleStart - overscan
    );

    const endIndex = Math.min(
        rowCount - 1,
        visibleEnd + overscan
    );

    const offsetTop = startIndex * rowHeight;

    return {
        startIndex,
        endIndex,
        offsetTop,
        totalHeight,
    };
}