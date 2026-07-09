"use client";

import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth/auth-provider";
import { api } from "@/utils/api";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  ImageIcon,
  ImagePlus,
  Paperclip,
  AlertCircle,
} from "lucide-react";
import Stepper, { Step } from "../src/componentcomponents/ui/Stepper.jsx";

type StartCounselingModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type OpenMenu = "service" | "topic" | "stage" | null;
type AttachmentKind = "image" | "file";

type AttachmentItem = {
  id: string;
  name: string;
  sizeLabel: string;
  kind: AttachmentKind;
  dbId?: number;
  isUploading?: boolean;
  error?: string;
};

type CounselingFormState = {
  serviceType: string;
  topic: string;
  stage: string;
  subject: string;
  detail: string;
};

const SERVICE_OPTIONS = ["Konseling Tatap Muka", "Konseling Online"];
const TOPIC_OPTIONS = [
  "Konseling masalah akademik",
  "Konseling masalah karier",
  "Konseling masalah keluarga",
  "Konseling masalah perundungan",
  "Konseling masalah pribadi sosial",
];
const STAGE_OPTIONS = ["Konseling pertama", "Konseling lanjutan"];

const initialFormState: CounselingFormState = {
  serviceType: "",
  topic: "",
  stage: "",
  subject: "",
  detail: "",
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function StartCounselingStepper({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState<CounselingFormState>(initialFormState);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [currentStep]);

  useEffect(() => {
    if (!openMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".start-counseling-select")) {
        setOpenMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  const validation = useMemo(
    () => ({
      serviceType: SERVICE_OPTIONS.includes(form.serviceType),
      topic: TOPIC_OPTIONS.includes(form.topic),
      stage: STAGE_OPTIONS.includes(form.stage),
      subject: form.subject.trim().length >= 6,
      detail: form.detail.trim().length >= 20,
    }),
    [form.detail, form.serviceType, form.stage, form.subject, form.topic]
  );

  const canContinue = useMemo(() => {
    if (currentStep === 1) return validation.serviceType;
    if (currentStep === 2) return validation.topic;
    if (currentStep === 3) return validation.stage;
    if (currentStep === 4) return validation.subject && validation.detail;
    return true;
  }, [currentStep, validation.detail, validation.serviceType, validation.stage, validation.subject, validation.topic]);

  const clickHiddenNext = () => {
    const hiddenNext = document.getElementById("start-counseling-hidden-next");
    hiddenNext?.click();
  };

  const uploadFile = async (rawFile: File) => {
    const formData = new FormData();
    formData.append("file", rawFile);
    const token = localStorage.getItem("ub_counseling_jwt");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/uploads`, {
      method: "POST",
      headers: {
        "Authorization": token ? `Bearer ${token}` : ""
      },
      body: formData
    });
    if (!res.ok) {
      throw new Error("Gagal mengunggah file");
    }
    return await res.json();
  };

  const addAttachments = async (files: FileList | null, kind: AttachmentKind) => {
    if (!files?.length) return;
    const newItems = Array.from(files).map((file, index) => {
      const tempId = `${kind}-${Date.now()}-${index}-${file.name}`;
      
      uploadFile(file).then((uploaded) => {
        setAttachments((current) =>
          current.map((item) =>
            item.id === tempId
              ? { ...item, dbId: uploaded.id, name: uploaded.file_name, sizeLabel: formatFileSize(uploaded.file_size), isUploading: false }
              : item
          )
        );
      }).catch((err) => {
        setAttachments((current) =>
          current.map((item) =>
            item.id === tempId
              ? { ...item, isUploading: false, error: "Gagal mengunggah file" }
              : item
          )
        );
      });

      return {
        id: tempId,
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        kind,
        isUploading: true,
      };
    });
    setAttachments((current) => [...current, ...newItems]);
  };

  const onImagePicked = (event: ChangeEvent<HTMLInputElement>) => {
    addAttachments(event.target.files, "image");
    event.target.value = "";
  };

  const onFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    addAttachments(event.target.files, "file");
    event.target.value = "";
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) => current.filter((item) => item.id !== attachmentId));
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setOpenMenu(null);
    setFormError(null);
    setIsSubmitted(false);
    setForm(initialFormState);
    setAttachments([]);
  };

  const submitIntake = async () => {
    if (!validation.subject || !validation.detail) {
      setFormError("Subjek minimal 6 karakter dan cerita detail minimal 20 karakter.");
      return;
    }
    const hasUploading = attachments.some(a => a.isUploading);
    if (hasUploading) {
      setFormError("Harap tunggu hingga semua berkas selesai diunggah.");
      return;
    }
    try {
      setFormError(null);
      const attachmentIds = attachments.map(a => a.dbId).filter((id): id is number => id !== undefined);
      await api.post("/api/tickets", {
        title: form.subject,
        category: form.topic,
        tahap_konseling: form.stage.toLowerCase().includes("pertama") ? "Pertama" : "Lanjutan",
        service_type: form.serviceType.toLowerCase().includes("tatap") ? "tatap_muka" : "online",
        detail: form.detail,
        attachment_ids: attachmentIds,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setFormError(err.message || "Gagal membuat sesi konseling baru.");
    }
  };

  if (isSubmitted) {
    return (
      <section className="auth-page auth-page-modal">
        <div className="auth-card-modal start-counseling-card">
          <div className="auth-modal-header">
            <div className="auth-modal-brand">
              <Image
                src="/branding/logo-konseling.png"
                alt="Logo Layanan Konseling"
                width={42}
                height={42}
                className="auth-modal-brand-logo"
                priority
              />
              <span>Layanan Konseling</span>
            </div>
            <button
              type="button"
              className="auth-close"
              onClick={onClose}
              aria-label="Tutup pop up mulai konseling"
            >
              <span />
              <span />
            </button>
          </div>

          <div className="start-counseling-success">
            <p className="eyebrow">Terkirim</p>
            <h3>Permintaan konseling berhasil dikirim.</h3>
            <p>Tim konseling akan meninjau laporanmu dan menghubungi kamu secepatnya.</p>

            <div className="start-counseling-summary">
              <p>
                <strong>Jenis Layanan:</strong> {form.serviceType}
              </p>
              <p>
                <strong>Topik:</strong> {form.topic}
              </p>
              <p>
                <strong>Tahap:</strong> {form.stage}
              </p>
              <p>
                <strong>Lampiran:</strong> {attachments.length} item
              </p>
            </div>

            <div className="auth-success-actions">
              <button type="button" className="button button-secondary" onClick={resetFlow}>
                Buat Laporan Baru
              </button>
              <button type="button" className="button button-primary" onClick={() => {
                onClose();
                if (onSuccess) onSuccess();
              }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page auth-page-modal">
      <div
        className={`auth-card-modal auth-card-stepper start-counseling-card ${
          currentStep === 4 ? "start-counseling-card-scroll" : ""
        }`}
      >
        <div className="auth-modal-header">
          <div className="auth-modal-brand">
            <Image
              src="/branding/logo-konseling.png"
              alt="Logo Layanan Konseling"
              width={42}
              height={42}
              className="auth-modal-brand-logo"
              priority
            />
            <span>Layanan Konseling</span>
          </div>
          <button
            type="button"
            className="auth-close"
            onClick={onClose}
            aria-label="Tutup pop up mulai konseling"
          >
            <span />
            <span />
          </button>
        </div>

        <Stepper
          key="start-counseling-stepper"
          initialStep={1}
          onStepChange={setCurrentStep}
          onFinalStepCompleted={submitIntake}
          renderStepIndicator={undefined}
          canNavigateToStep={({ targetStep, currentStep: stepNow }) => targetStep < stepNow}
          nextButtonText="Next"
          completeButtonText="Kirim"
          nextButtonProps={{
            id: "start-counseling-hidden-next",
            disabled: !canContinue,
          }}
          backButtonText="Previous"
          stepCircleContainerClassName="auth-stepper-shell"
          stepContainerClassName="auth-stepper-track"
          contentClassName="auth-stepper-content"
          contentOverflow={openMenu ? "visible" : "hidden"}
          footerClassName="auth-stepper-footer auth-stepper-footer-hidden"
        >
          <Step>
            <div className="auth-step-pane">
              <div className="auth-step-heading">
                <h3>Pilih Jenis Layanan Konseling</h3>
              </div>
              <label className="auth-field auth-field-inline">
                <div
                  className={`auth-custom-select start-counseling-select ${
                    openMenu === "service" ? "auth-custom-select-open" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`auth-select-trigger ${form.serviceType ? "auth-select-has-value" : ""}`}
                    onClick={() =>
                      setOpenMenu((current) => (current === "service" ? null : "service"))
                    }
                    aria-expanded={openMenu === "service"}
                    aria-haspopup="listbox"
                  >
                    <span>{form.serviceType || "Pilih jenis layanan"}</span>
                    <ChevronDown size={18} className="auth-select-chevron" />
                  </button>

                  {openMenu === "service" ? (
                    <div className="auth-select-menu" role="listbox" aria-label="Pilih jenis layanan">
                      {SERVICE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={form.serviceType === option}
                          className={`auth-select-option ${
                            form.serviceType === option ? "auth-select-option-active" : ""
                          }`}
                          onClick={() => {
                            setForm((current) => ({ ...current, serviceType: option }));
                            setOpenMenu(null);
                            setFormError(null);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="auth-inline-next"
                  aria-label="Lanjut ke topik konseling"
                  onClick={clickHiddenNext}
                  disabled={!canContinue}
                >
                  <ArrowRight size={18} strokeWidth={2.4} />
                </button>
              </label>
            </div>
          </Step>

          <Step>
            <div className="auth-step-pane">
              <div className="auth-step-heading">
                <h3>Pilih Topik Konseling</h3>
              </div>
              <label className="auth-field auth-field-inline">
                <div
                  className={`auth-custom-select start-counseling-select ${
                    openMenu === "topic" ? "auth-custom-select-open" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`auth-select-trigger ${form.topic ? "auth-select-has-value" : ""}`}
                    onClick={() =>
                      setOpenMenu((current) => (current === "topic" ? null : "topic"))
                    }
                    aria-expanded={openMenu === "topic"}
                    aria-haspopup="listbox"
                  >
                    <span>{form.topic || "Pilih topik konseling"}</span>
                    <ChevronDown size={18} className="auth-select-chevron" />
                  </button>

                  {openMenu === "topic" ? (
                    <div className="auth-select-menu" role="listbox" aria-label="Pilih topik konseling">
                      {TOPIC_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={form.topic === option}
                          className={`auth-select-option ${
                            form.topic === option ? "auth-select-option-active" : ""
                          }`}
                          onClick={() => {
                            setForm((current) => ({ ...current, topic: option }));
                            setOpenMenu(null);
                            setFormError(null);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="auth-inline-next"
                  aria-label="Lanjut ke tahap konseling"
                  onClick={clickHiddenNext}
                  disabled={!canContinue}
                >
                  <ArrowRight size={18} strokeWidth={2.4} />
                </button>
              </label>
            </div>
          </Step>

          <Step>
            <div className="auth-step-pane">
              <div className="auth-step-heading">
                <h3>Pilih Tahap Konseling</h3>
              </div>
              <label className="auth-field auth-field-inline">
                <div
                  className={`auth-custom-select start-counseling-select ${
                    openMenu === "stage" ? "auth-custom-select-open" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`auth-select-trigger ${form.stage ? "auth-select-has-value" : ""}`}
                    onClick={() =>
                      setOpenMenu((current) => (current === "stage" ? null : "stage"))
                    }
                    aria-expanded={openMenu === "stage"}
                    aria-haspopup="listbox"
                  >
                    <span>{form.stage || "Pilih tahap konseling"}</span>
                    <ChevronDown size={18} className="auth-select-chevron" />
                  </button>

                  {openMenu === "stage" ? (
                    <div className="auth-select-menu" role="listbox" aria-label="Pilih tahap konseling">
                      {STAGE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={form.stage === option}
                          className={`auth-select-option ${
                            form.stage === option ? "auth-select-option-active" : ""
                          }`}
                          onClick={() => {
                            setForm((current) => ({ ...current, stage: option }));
                            setOpenMenu(null);
                            setFormError(null);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="auth-inline-next"
                  aria-label="Lanjut ke form cerita"
                  onClick={clickHiddenNext}
                  disabled={!canContinue}
                >
                  <ArrowRight size={18} strokeWidth={2.4} />
                </button>
              </label>
            </div>
          </Step>

          <Step>
            <div className="auth-step-pane start-counseling-last-step">
              <div className="auth-step-heading">
                <h3>Ceritakan kebutuhan konselingmu</h3>
              </div>

              <label className="auth-field">
                <span>Subjek</span>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  placeholder="Contoh: Sulit fokus menjelang ujian"
                />
              </label>

              <label className="auth-field">
                <span>Cerita Detail</span>
                <textarea
                  className="start-counseling-textarea"
                  value={form.detail}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, detail: event.target.value }))
                  }
                  placeholder="Tulis cerita secara detail agar tim konseling memahami kondisi kamu."
                />
                <small className="start-counseling-help">
                  Minimal 20 karakter. Saat ini {form.detail.trim().length} karakter.
                </small>
              </label>

              <div className="auth-field">
                <div className="start-counseling-attachment-header">
                  <span>Lampiran (Opsional)</span>
                  <div className="start-counseling-upload-row">
                    <button
                      type="button"
                      className="start-counseling-upload-button"
                      onClick={() => imageInputRef.current?.click()}
                      aria-label="Tambah gambar"
                      title="Tambah gambar"
                    >
                      <ImagePlus size={16} />
                    </button>
                    <button
                      type="button"
                      className="start-counseling-upload-button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Tambah file"
                      title="Tambah file"
                    >
                      <Paperclip size={16} />
                    </button>
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="start-counseling-upload-input"
                    onChange={onImagePicked}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                    multiple
                    className="start-counseling-upload-input"
                    onChange={onFilePicked}
                  />
                </div>

                {attachments.length ? (
                  <div className="start-counseling-attachment-list">
                    {attachments.map((item) => (
                      <div
                        key={item.id}
                        className="start-counseling-attachment-chip"
                        title={`${item.name} (${item.sizeLabel})`}
                        style={item.isUploading ? { opacity: 0.6, cursor: "not-allowed" } : item.error ? { border: "1px solid #ef4444" } : undefined}
                      >
                        <span
                          className="start-counseling-attachment-kind"
                          aria-hidden="true"
                        >
                          {item.kind === "image" ? (
                            <ImageIcon size={14} />
                          ) : (
                            <FileText size={14} />
                          )}
                        </span>
                        {item.isUploading && (
                          <span style={{ fontSize: "10px", color: "var(--text-secondary)", marginRight: "4px" }}>Mengunggah...</span>
                        )}
                        {item.error && (
                          <span style={{ fontSize: "10px", color: "#ef4444", marginRight: "4px" }} title={item.error}>Gagal</span>
                        )}
                        <button
                          type="button"
                          aria-label={`Hapus lampiran ${item.name}`}
                          onClick={() => removeAttachment(item.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {form.subject && !validation.subject ? (
                <p className="auth-field-inline-message">
                  Subjek minimal 6 karakter.
                </p>
              ) : null}
              {form.detail && !validation.detail ? (
                <p className="auth-field-inline-message">
                  Cerita detail minimal 20 karakter.
                </p>
              ) : null}
              {formError ? <p className="auth-field-inline-message">{formError}</p> : null}

              <button
                type="button"
                className="button button-primary start-counseling-submit"
                onClick={clickHiddenNext}
                disabled={!canContinue}
              >
                <Check size={16} />
                Kirim Permintaan
              </button>
            </div>
          </Step>
        </Stepper>
      </div>
    </section>
  );
}

export default function StartCounselingModal({ open, onClose, onSuccess }: StartCounselingModalProps) {
  const { user, updateStudentProfile } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileGender, setProfileGender] = useState("");
  const [profileFaculty, setProfileFaculty] = useState("");
  const [profileDepartment, setProfileDepartment] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [formError, setFormError] = useState("");
  const [activeTicket, setActiveTicket] = useState<{ id: number; code: string } | null>(null);
  const [isLoadingActiveCheck, setIsLoadingActiveCheck] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setProfileName(user.fullName);
      setProfileGender(user.gender ?? "");
      setProfileFaculty(user.faculty ?? "");
      setProfileDepartment(user.department ?? "");
      setProfilePhone(user.phone ?? "");
    }
  }, [user]);

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

  if (!open) return null;

  const handleSSORedirect = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/sso`;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const res = await updateStudentProfile({
      nim: user.nim,
      fullName: profileName,
      gender: profileGender,
      faculty: profileFaculty,
      department: profileDepartment,
      email: user.email || "",
      phone: profilePhone,
    });
    if (!res.ok) {
      setFormError(res.message || "Gagal memperbarui profil.");
    } else {
      setFormError("");
    }
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
          <div className="auth-card-modal" style={{ padding: "32px", textAlign: "center" }}>
            <h2 className="auth-success-title" style={{ marginBottom: "12px" }}>Akses Terbatas</h2>
            <p className="auth-success-message" style={{ marginBottom: "24px" }}>
              Silakan login menggunakan akun resmi Universitas Brawijaya terlebih dahulu untuk melakukan konsultasi konseling.
            </p>
            <button type="button" className="button button-primary" onClick={handleSSORedirect} style={{ width: "100%", justifyContent: "center" }}>
              Masuk dengan SSO UB
            </button>
          </div>
        ) : activeTicket ? (
          <div className="auth-card-modal" style={{ padding: "24px", textAlign: "left" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "rgba(249, 115, 22, 0.08)",
                color: "#f97316",
                flexShrink: 0
              }}>
                <AlertCircle size={18} />
              </div>
              <h2 style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0
              }}>
                Sesi Konseling Aktif
              </h2>
            </div>
            <p style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              lineHeight: "1.5",
              marginBottom: "20px"
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
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link
                href={`/tickets/${activeTicket.id}`}
                className="button button-primary"
                onClick={onClose}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "10px 16px",
                  fontSize: "13px"
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
                  padding: "10px 16px",
                  fontSize: "13px"
                }}
              >
                Kembali
              </button>
            </div>
          </div>
        ) : isProfileIncomplete ? (
          <div className="auth-card-modal" style={{ padding: "32px", textAlign: "left", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 className="auth-success-title" style={{ textAlign: "center", marginBottom: "8px" }}>Lengkapi Profil Anda</h2>
            <p className="auth-success-message" style={{ textAlign: "center", marginBottom: "24px" }}>
              Harap lengkapi biodata Anda sebelum mengajukan sesi konseling baru.
            </p>
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Nama Lengkap</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Jenis Kelamin</label>
                  <select
                    value={profileGender}
                    onChange={(e) => setProfileGender(e.target.value)}
                    required
                    className="input"
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", padding: "8px 12px", color: "#fff" }}
                  >
                    <option value="">Pilih</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Nomor HP</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    required
                    placeholder="0812..."
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Fakultas</label>
                <select
                  value={profileFaculty}
                  onChange={(e) => setProfileFaculty(e.target.value)}
                  required
                  className="input"
                  style={{ width: "100%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", padding: "8px 12px", color: "#fff" }}
                >
                  <option value="">Pilih Fakultas</option>
                  <option value="Fakultas Ilmu Komputer">Fakultas Ilmu Komputer</option>
                  <option value="Fakultas Teknik">Fakultas Teknik</option>
                  <option value="Fakultas Kedokteran">Fakultas Kedokteran</option>
                  <option value="Fakultas Hukum">Fakultas Hukum</option>
                  <option value="Fakultas Ekonomi dan Bisnis">Fakultas Ekonomi dan Bisnis</option>
                  <option value="Fakultas Ilmu Administrasi">Fakultas Ilmu Administrasi</option>
                  <option value="Fakultas Pertanian">Fakultas Pertanian</option>
                  <option value="Fakultas Peternakan">Fakultas Peternakan</option>
                  <option value="Fakultas Perikanan dan Ilmu Kelautan">Fakultas Perikanan dan Ilmu Kelautan</option>
                  <option value="Fakultas Matematika dan Ilmu Pengetahuan Alam">Fakultas Matematika dan Ilmu Pengetahuan Alam</option>
                  <option value="Fakultas Ilmu Sosial dan Ilmu Politik">Fakultas Ilmu Sosial dan Ilmu Politik</option>
                  <option value="Fakultas Ilmu Budaya">Fakultas Ilmu Budaya</option>
                  <option value="Fakultas Vokasi">Fakultas Vokasi</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>Jurusan</label>
                <input
                  type="text"
                  value={profileDepartment}
                  onChange={(e) => setProfileDepartment(e.target.value)}
                  required
                  placeholder="Teknik Informatika"
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              {formError && <p style={{ color: "#ff6b6b", fontSize: "13px" }}>{formError}</p>}

              <button type="submit" className="button button-primary" style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
                Simpan & Lanjutkan
              </button>
            </form>
          </div>
        ) : (
          <StartCounselingStepper onClose={onClose} onSuccess={onSuccess} />
        )}
      </div>
    </div>,
    document.body
  );
}
