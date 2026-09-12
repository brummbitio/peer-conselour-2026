"use client";

import { useCallback, useMemo, useState } from "react";

/** Jumlah item per halaman untuk semua list kartu di portal. */
export const PORTAL_PAGE_SIZE = 10;

export type PaginationState<T> = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageItems: T[];
  setPage: (page: number) => void;
};

export function usePagination<T>(items: readonly T[], pageSize: number = PORTAL_PAGE_SIZE): PaginationState<T> {
  const [requestedPage, setRequestedPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  // Halaman di-clamp saat render: bila data menyusut (filter, pencarian, atau
  // refetch), list tidak pernah jatuh ke halaman kosong.
  const page = Math.min(requestedPage, totalPages);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  const setPage = useCallback((next: number) => {
    setRequestedPage(Math.max(1, next));
  }, []);

  return { page, totalPages, totalItems, pageSize, pageItems, setPage };
}

export type PageToken = number | "ellipsis";

/** Maksimal 5 tombol angka + elipsis, sama seperti paginasi dashboard sebelumnya. */
export function getPageTokens(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PageToken[] = [1];
  if (page > 3) tokens.push("ellipsis");

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let current = start; current <= end; current++) {
    tokens.push(current);
  }

  if (page < totalPages - 2) tokens.push("ellipsis");
  tokens.push(totalPages);
  return tokens;
}
