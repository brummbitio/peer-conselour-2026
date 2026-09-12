"use client";

import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./auth/auth-provider";
import { api, BASE_URL } from "@/utils/api";
import { AlertCircle, Lock, X } from "lucide-react";
import { ProfileCompletionForm } from "./start-counseling/ProfileCompletionForm";
import { CounselingFormStepper } from "./start-counseling/CounselingFormStepper";
import "./styles/auth.css";


export type StartCounselingModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export type OpenMenu = "service" | "topic" | "stage" | null;
export type AttachmentKind = "image" | "file";

export type AttachmentItem = {
  id: string;
  name: string;
  sizeLabel: string;
  kind: AttachmentKind;
  dbId?: number;
  isUploading?: boolean;
  error?: string;
};

export type CounselingFormState = {
  serviceType: string;
  topic: string;
  stage: string;
  // null until the student picks "Pernah" or "Belum Pernah" in step 4
  hasPsychologistExp: boolean | null;
  subject: string;
  detail: string;
};

export default function StartCounselingModal({ open, onClose, onSuccess }: StartCounselingModalProps) {
  const { user, updateStudentProfile } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTicket, setActiveTicket] = useState<{ id: number; code: string } | null>(null);
  const [isLoadingActiveCheck, setIsLoadingActiveCheck] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !user) return;

    async function checkActiveTicket() {
      setIsLoadingActiveCheck(true);
      try {
        const tickets = await api.get("/api/tickets");
        if (Array.isArray(tickets)) {
          const active = tickets.find(
            (t: any) => t.status === "open" || t.status === "in_progress"
          );
          if (active) {
            setActiveTicket({ id: active.id, code: active.code });
          } else {
            setActiveTicket(null);
          }
        }
      } catch (err) {
        console.error("Failed to check active tickets:", err);
      } finally {
        setIsLoadingActiveCheck(false);
      }
    }

    checkActiveTicket();
  }, [open, user]);

  const handleSSORedirect = () => {
    window.location.href = `${BASE_URL}/api/auth/sso`;
  };

  const isProfileIncomplete = user && user.role === "student" && (!user.phone || !user.gender || !user.faculty || !user.department);

  if (!open || !isMounted) return null;

  return createPortal(
    <div
      className="auth-modal start-counseling-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Mulai konseling"
    >
      <button
        type="button"
        className="auth-modal-backdrop"
        aria-label="Tutup pop up mulai konseling"
        onClick={onClose}
      />
      <div 
        className="auth-modal-panel start-counseling-modal-panel"
        style={activeTicket ? { maxWidth: "380px" } : {}}
      >
        {isLoadingActiveCheck ? (
          <div className="auth-card-modal" style={{ padding: "32px", textAlign: "center" }}>
            <div className="loader-progress-bar" style={{ width: "100px", margin: "0 auto 16px" }}>
              <div className="loader-progress-fill" />
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Memverifikasi status sesi...</span>
          </div>
        ) : !user ? (
          <div className="auth-card-modal" style={{ margin: "0 auto", padding: "32px 28px", textAlign: "left", borderRadius: "24px", boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)" }}>
            <div className="auth-modal-header" style={{ marginBottom: "28px" }}>
              <div className="auth-modal-brand">
                <Image
                  src="/branding/logo-konseling.png"
                  alt="Logo Layanan Konseling"
                  width={42}
                  height={42}
                  className="auth-modal-brand-logo"
                  priority
                />
                <div>
                  <p style={{ fontSize: "14.5px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    Layanan Konseling
                  </p>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginTop: "1px" }}>
                    Universitas Brawijaya
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="auth-close"
                onClick={onClose}
                aria-label="Tutup pop up"
                style={{ position: "relative", top: "auto", right: "auto" }}
              >
                <span />
                <span />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: "8px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(84, 171, 199, 0.12) 0%, rgba(12, 35, 64, 0.04) 100%)",
                color: "#54abc7",
                marginBottom: "20px",
                boxShadow: "0 8px 24px rgba(84, 171, 199, 0.15)",
                border: "1px solid rgba(84, 171, 199, 0.2)"
              }}>
                <Lock size={24} strokeWidth={2.2} />
              </div>

              <h2 className="auth-success-title" style={{ fontSize: "22px", fontWeight: 700, marginBottom: "24px", color: "var(--text-primary)", textAlign: "center" }}>
                Selamat Datang
              </h2>
              
              <button
                type="button"
                className="button button-primary"
                onClick={handleSSORedirect}
                style={{ 
                  width: "100%", 
                  justifyContent: "center", 
                  padding: "12px", 
                  fontSize: "14px", 
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 10px 25px rgba(84, 171, 199, 0.3)"
                }}
              >
                Masuk dengan SSO UB
              </button>

              {/* Dev Bypass Login - Hanya tampil di localhost & mode development */}
              {process.env.NODE_ENV !== "production" && 
               typeof window !== "undefined" && 
               (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && 
               BASE_URL.includes("localhost") && (
                <div style={{ marginTop: "20px", width: "100%", borderTop: "1px dashed rgba(17, 24, 39, 0.08)", paddingTop: "16px" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "10px" }}>
                    🛠️ Mode Pengembangan: Bypass SSO
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input 
                      type="number" 
                      placeholder="Masukkan User ID (e.g. 1)" 
                      id="dev-login-user-id"
                      style={{
                        padding: "8px 12px",
                        fontSize: "12.5px",
                        borderRadius: "8px",
                        border: "1px solid rgba(17, 24, 39, 0.12)",
                        outline: "none",
                        width: "100%",
                        textAlign: "center"
                      }}
                    />
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        const input = document.getElementById("dev-login-user-id") as HTMLInputElement;
                        const userId = input?.value || "1";
                        window.location.href = `${BASE_URL}/api/auth/dev-login?id=${userId}`;
                      }}
                      style={{ 
                        width: "100%", 
                        justifyContent: "center", 
                        padding: "8px", 
                        fontSize: "12.5px", 
                        fontWeight: 600,
                        background: "rgba(17, 24, 39, 0.05)",
                        color: "var(--text-primary)",
                        border: "1px solid rgba(17, 24, 39, 0.1)"
                      }}
                    >
                      Bypass Masuk
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTicket ? (
          <div className="auth-card-modal start-counseling-card" style={{ padding: "32px 28px", margin: "0 auto" }}>
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

            {/* Body - Aligned with Login modal design */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 0" }}>
              {/* Glowing orange warning circle */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(249, 115, 22, 0.04) 100%)",
                color: "#f97316",
                marginBottom: "20px",
                boxShadow: "0 8px 24px rgba(249, 115, 22, 0.15)",
                border: "1px solid rgba(249, 115, 22, 0.2)"
              }}>
                <AlertCircle size={28} />
              </div>

              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px", textAlign: "center", lineHeight: "1.4" }}>
                Sesi Konseling Aktif
              </h3>
              
              <p style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
                textAlign: "center",
                marginBottom: "32px",
                maxWidth: "320px"
              }}>
                Kamu masih memiliki sesi konseling aktif dengan Nomor Tiket{" "}
                <code style={{
                  fontFamily: "monospace",
                  backgroundColor: "rgba(17, 24, 39, 0.05)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: 600,
                  color: "var(--text-primary)"
                }}>
                  {activeTicket.code}
                </code>
                . Harap selesaikan sesi tersebut terlebih dahulu sebelum memulai konseling baru.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                <Link
                  href={`/tickets/${activeTicket.id}`}
                  className="button button-primary"
                  onClick={onClose}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 600
                  }}
                >
                  Buka Tiket Aktif
                </Link>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onClose}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 600
                  }}
                >
                  Kembali
                </button>
              </div>
            </div>
          </div>
        ) : isProfileIncomplete ? (
          <ProfileCompletionForm
            user={user}
            updateStudentProfile={updateStudentProfile}
            onClose={onClose}
            onCompleted={() => {
              // Trigger ticket active state reload or profiles updates implicitly
              if (onSuccess) onSuccess();
            }}
          />
        ) : (
          <CounselingFormStepper onClose={onClose} onSuccess={onSuccess} />
        )}
      </div>
    </div>,
    document.body
  );
}
