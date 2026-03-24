import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({ children, sortKey, currentSort, onSort, className }: SortableTableHeadProps) {
  const isActive = currentSort.key === sortKey;
  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:text-foreground transition-colors", className)}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (
          currentSort.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

export function useSort(defaultKey: string, defaultDirection: SortDirection = "asc") {
  const [sort, setSort] = useState<SortConfig>({ key: defaultKey, direction: defaultDirection });

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  return { sort, toggleSort };
}

import { useState } from "react";

export function sortItems<T>(items: T[], sort: SortConfig, accessor: (item: T, key: string) => string | number): T[] {
  return [...items].sort((a, b) => {
    const aVal = accessor(a, sort.key);
    const bVal = accessor(b, sort.key);
    const cmp = typeof aVal === "string" && typeof bVal === "string"
      ? aVal.localeCompare(bVal, "nl")
      : (aVal as number) - (bVal as number);
    return sort.direction === "asc" ? cmp : -cmp;
  });
}
