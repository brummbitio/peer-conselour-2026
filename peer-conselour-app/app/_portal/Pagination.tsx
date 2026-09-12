import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "./format";
import { getPageTokens } from "./usePagination";
import "../styles/portal-ui.css";

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
};

export const Pagination = memo(function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  ariaLabel = "Navigasi halaman",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav className="portal-pagination" aria-label={ariaLabel}>
      <button
        type="button"
        className="portal-pagination-step"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {getPageTokens(page, totalPages).map((token, index) =>
        token === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="portal-pagination-ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={token}
            type="button"
            className={`portal-pagination-page${token === page ? " is-active" : ""}`}
            aria-current={token === page ? "page" : undefined}
            aria-label={`Halaman ${token}`}
            onClick={() => {
              if (token !== page) onPageChange(token);
            }}
          >
            {token}
          </button>
        )
      )}

      <button
        type="button"
        className="portal-pagination-step"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      <p className="portal-pagination-summary">
        Menampilkan {formatNumber(firstItem)}–{formatNumber(lastItem)} dari {formatNumber(totalItems)}
      </p>
    </nav>
  );
});
