import { useEffect, useMemo, useState } from 'react';

interface UsePaginationParams<T> {
  items: T[];
  initialPageSize?: number;
  resetDeps?: unknown[];
}

export function usePagination<T>({
  items,
  initialPageSize = 10,
  resetDeps = []
}: UsePaginationParams<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, resetDeps);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, page, pageSize]);

  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    startItem,
    endItem,
    paginatedItems
  };
}
