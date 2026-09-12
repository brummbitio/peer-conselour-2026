import "../styles/portal-ui.css";

type PortalLoaderProps = {
  label: string;
  /** "page" membungkus loader dalam section halaman; "inline" untuk area konten/tab. */
  variant?: "page" | "inline";
};

export function PortalLoader({ label, variant = "page" }: PortalLoaderProps) {
  const loader = (
    <div
      className={`portal-loader${variant === "inline" ? " portal-loader-inline" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="portal-loader-bar" aria-hidden="true" />
      <span className="portal-loader-label">{label}</span>
    </div>
  );

  if (variant === "inline") return loader;
  return <section className="section site-width account-page">{loader}</section>;
}

/** Skeleton shimmer berbentuk kartu tiket, dipakai saat list pertama kali dimuat. */
export function TicketCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="portal-card-stack" role="status" aria-label="Memuat daftar tiket">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="portal-skeleton-card" aria-hidden="true">
          <div className="portal-skeleton-top">
            <div className="portal-skeleton-line is-chip" />
          </div>
          <div className="portal-skeleton-body">
            <div className="portal-skeleton-line is-title" />
            <div className="portal-skeleton-line is-meta" />
          </div>
        </div>
      ))}
    </div>
  );
}
