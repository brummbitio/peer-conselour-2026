import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { BackTarget } from "./routes";
import "../styles/portal-ui.css";

/** Tombol kembali seragam: ikon ArrowLeft, hover halus, label deskriptif. */
export function BackLink({ href, label }: BackTarget) {
  return (
    <div className="portal-back-row">
      <Link href={href} className="portal-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    </div>
  );
}
