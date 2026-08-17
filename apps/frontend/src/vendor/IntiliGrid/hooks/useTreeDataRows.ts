import { useCallback, useMemo, useState } from "react";

import type { GridRowModel } from "../models";

export interface GridTreeNodeMeta {
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
}

interface TreeNode<T extends GridRowModel> {
    key: string;
    parentKey?: string;
    row: T;
    children: TreeNode<T>[];
}

function pathKey(path: readonly (string | number)[]) {
    return JSON.stringify(path.map(String));
}

export function useTreeDataRows<T extends GridRowModel>(
    rows: T[],
    enabled: boolean,
    getTreeDataPath?: (row: T) => readonly (string | number)[],
    defaultExpansionDepth = -1
) {
    const [expansionOverrides, setExpansionOverrides] = useState<Map<string, boolean>>(
        () => new Map()
    );

    const toggleNode = useCallback((key: string, expanded: boolean) => {
        setExpansionOverrides((current) => {
            const next = new Map(current);
            next.set(key, !expanded);
            return next;
        });
    }, []);

    return useMemo(() => {
        const metadata = new Map<T["id"], GridTreeNodeMeta & { key: string }>();
        if (!enabled || !getTreeDataPath) {
            return { rows, metadata, toggleNode };
        }

        const nodes = new Map<string, TreeNode<T>>();
        for (const row of rows) {
            const path = getTreeDataPath(row);
            if (!path.length) continue;
            const key = pathKey(path);
            nodes.set(key, {
                key,
                parentKey: path.length > 1 ? pathKey(path.slice(0, -1)) : undefined,
                row,
                children: [],
            });
        }

        const roots: TreeNode<T>[] = [];
        for (const node of nodes.values()) {
            const parent = node.parentKey ? nodes.get(node.parentKey) : undefined;
            if (parent && parent !== node) parent.children.push(node);
            else roots.push(node);
        }

        const visibleRows: T[] = [];
        const visited = new Set<string>();
        const reachable = new Set<string>();
        const markReachable = (node: TreeNode<T>) => {
            if (reachable.has(node.key)) return;
            reachable.add(node.key);
            node.children.forEach(markReachable);
        };
        roots.forEach(markReachable);

        const visit = (node: TreeNode<T>, depth: number) => {
            if (visited.has(node.key)) return;
            visited.add(node.key);

            const defaultExpanded = defaultExpansionDepth === -1 || depth < defaultExpansionDepth;
            const expanded = expansionOverrides.get(node.key) ?? defaultExpanded;
            metadata.set(node.row.id, {
                key: node.key,
                depth,
                hasChildren: node.children.length > 0,
                expanded,
            });
            visibleRows.push(node.row);
            if (expanded) node.children.forEach((child) => visit(child, depth + 1));
        };

        roots.forEach((root) => visit(root, 0));
        // Invalid/cyclic paths remain usable as top-level rows rather than disappearing.
        for (const node of nodes.values()) {
            if (!reachable.has(node.key)) visit(node, 0);
        }

        return { rows: visibleRows, metadata, toggleNode };
    }, [rows, enabled, getTreeDataPath, defaultExpansionDepth, expansionOverrides, toggleNode]);
}
