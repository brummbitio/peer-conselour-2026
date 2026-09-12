"use client";

import { X } from "lucide-react";
import Image from "next/image";

interface SuccessScreenProps {
  form: {
    serviceType: string;
    topic: string;
    stage: string;
  };
  attachmentsCount: number;
  onClose: () => void;
  onSuccess?: () => void;
  resetFlow: () => void;
}

const animationStyles = `
  @keyframes scaleIn {
    0% { transform: scale(0); opacity: 0; }
    80% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes drawCheck {
    0% { stroke-dashoffset: 48; }
    100% { stroke-dashoffset: 0; }
  }
  .animate-scale-in {
    animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-draw-check {
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: drawCheck 0.6s 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;

export function SuccessScreen({
  onClose,
  onSuccess,
  resetFlow,
}: SuccessScreenProps) {
  return (
    <section className="auth-page auth-page-modal">
      {/* Insert local animation styling */}
      <style>{animationStyles}</style>

      <div className="auth-card-modal start-counseling-card" style={{ padding: "28px 24px", margin: "0 auto", maxWidth: "380px", width: "100%" }}>
        {/* Header - Aligned with Login Modal */}
        <div className="auth-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "32px" }}>
          <div className="auth-modal-brand" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Image
              src="/branding/logo-konseling.png"
              alt="Logo UB"
              width={36}
              height={36}
              priority
            />
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--blue-dark)", lineHeight: 1.2 }}>Layanan Konseling</span>
              <span style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: 500, lineHeight: 1.1 }}>Universitas Brawijaya</span>
            </div>
          </div>
          <button
            type="button"
            className="auth-close"
            onClick={onClose}
            aria-label="Tutup"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(17, 24, 39, 0.04)",
              border: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-secondary)",
              transition: "background 150ms ease"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body - Clean layout with animated check icon */}
        <div className="start-counseling-success" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 0" }}>
          
          {/* Glowing Check Badge with Animation */}
          <div 
            className="animate-scale-in"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)",
              color: "#22c55e",
              marginBottom: "20px",
              boxShadow: "0 8px 24px rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              opacity: 0
            }}
          >
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline 
                className="animate-draw-check" 
                points="20 6 9 17 4 12" 
              />
            </svg>
          </div>

          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px", textAlign: "center", lineHeight: "1.4", maxWidth: "280px" }}>
            Permintaan konseling berhasil dikirim.
          </h3>

          <div className="auth-success-actions" style={{ width: "100%" }}>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                onClose();
                if (onSuccess) onSuccess();
              }}
              style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px", fontWeight: 600 }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
