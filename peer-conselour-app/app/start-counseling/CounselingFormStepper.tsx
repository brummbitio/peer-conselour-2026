"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/utils/api";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  ImageIcon,
  ImagePlus,
  Paperclip,
} from "lucide-react";
import Stepper, { Step } from "../../src/componentcomponents/ui/Stepper.jsx";
import { SuccessScreen } from "./SuccessScreen";
import type { OpenMenu, AttachmentKind, AttachmentItem, CounselingFormState } from "../StartCounselingModal";

interface CounselingFormStepperProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const SERVICE_OPTIONS = ["Konseling Tatap Muka", "Konseling Online"];
// Official topics; values are stored verbatim in tickets.category, so keep them
// in Title Case to match migrated legacy data.
const TOPIC_OPTIONS = [
  "Konseling Masalah Pribadi",
  "Konseling Masalah Sosial",
  "Konseling Masalah Akademik",
  "Konseling Masalah Karier",
  "Konseling Masalah Keluarga",
  "Konseling Masalah Perundungan",
];
const STAGE_OPTIONS = ["Konseling pertama", "Konseling lanjutan"];
// Batas ukuran lampiran sama dengan composer chat tiket
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const initialFormState: CounselingFormState = {
  serviceType: "",
  topic: "",
  stage: "",
  hasPsychologistExp: null,
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

export function CounselingFormStepper({
  onClose,
  onSuccess,
}: CounselingFormStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState<CounselingFormState>(initialFormState);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ref sebagai penjaga double-submit: klik beruntun tidak boleh membuat tiket ganda.
  const isSubmittingRef = useRef(false);
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
      serviceType: !!form.serviceType,
      topic: !!form.topic,
      stage: !!form.stage,
      psychologistExp: form.hasPsychologistExp !== null,
      subject: form.subject.trim().length >= 6,
      detail: form.detail.trim().length >= 20,
    }),
    [form]
  );

  const canContinue = useMemo(() => {
    if (currentStep === 1) return validation.serviceType;
    if (currentStep === 2) return validation.topic;
    if (currentStep === 3) return validation.stage;
    if (currentStep === 4) return validation.psychologistExp;
    if (currentStep === 5) return validation.subject && validation.detail;
    return false;
  }, [currentStep, validation]);

  const clickHiddenNext = () => {
    const hiddenNext = document.getElementById("start-counseling-hidden-next");
    hiddenNext?.click();
  };

  const uploadFile = async (rawFile: File) => {
    const formData = new FormData();
    formData.append("file", rawFile);
    const data = await api.upload("/api/uploads", formData);
    if (data && typeof data.id === "number") {
      return data.id;
    }
    throw new Error("Invalid response from server");
  };

  const addAttachments = async (files: FileList | null, kind: AttachmentKind) => {
    if (!files) return;
    const items: AttachmentItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setFormError(`File "${file.name}" melebihi batas ukuran maksimal (10 MB).`);
        continue;
      }

      const item: AttachmentItem = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        kind,
        isUploading: true,
      };
      items.push(item);

      // Start upload async
      (async () => {
        try {
          const dbId = await uploadFile(file);
          setAttachments((prev) =>
            prev.map((a) => (a.id === item.id ? { ...a, dbId, isUploading: false } : a))
          );
        } catch (err: any) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === item.id
                ? { ...a, isUploading: false, error: err.message || "Gagal mengunggah berkas" }
                : a
            )
          );
        }
      })();
    }
    setAttachments((prev) => [...prev, ...items]);
  };

  // Nilai input dikosongkan agar file yang sama bisa dipilih ulang setelah dihapus
  const onImagePicked = (event: ChangeEvent<HTMLInputElement>) => {
    addAttachments(event.target.files, "image");
    event.target.value = "";
  };

  const onFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    addAttachments(event.target.files, "file");
    event.target.value = "";
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const resetFlow = () => {
    setForm(initialFormState);
    setAttachments([]);
    setCurrentStep(1);
    setIsSubmitted(false);
    setFormError(null);
  };

  const submitIntake = async () => {
    if (isSubmittingRef.current) return;
    if (!validation.subject || !validation.detail) {
      setFormError("Subjek minimal 6 karakter dan cerita detail minimal 20 karakter.");
      return;
    }
    const hasUploading = attachments.some(a => a.isUploading);
    if (hasUploading) {
      setFormError("Harap tunggu hingga semua berkas selesai diunggah.");
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      setFormError(null);
      const attachmentIds = attachments.map(a => a.dbId).filter((id): id is number => id !== undefined);
      await api.post("/api/tickets", {
        title: form.subject,
        category: form.topic,
        tahap_konseling: form.stage.toLowerCase().includes("pertama") ? "Pertama" : "Lanjutan",
        service_type: form.serviceType.toLowerCase().includes("tatap") ? "tatap_muka" : "online",
        has_psychologist_exp: form.hasPsychologistExp,
        detail: form.detail,
        attachment_ids: attachmentIds,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setFormError(err.message || "Gagal membuat sesi konseling baru.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <SuccessScreen
        form={form}
        attachmentsCount={attachments.length}
        onClose={onClose}
        onSuccess={onSuccess}
        resetFlow={resetFlow}
      />
    );
  }

  return (
    <section className="auth-page auth-page-modal">
      <div
        className={`auth-card-modal auth-card-stepper start-counseling-card ${
          currentStep === 5 ? "start-counseling-card-scroll" : ""
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
            disabled: !canContinue || isSubmitting,
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
                  aria-label="Lanjut ke riwayat konsultasi"
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
                <h3>Riwayat Konsultasi</h3>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                  Pernah berkonsultasi ke psikolog atau psikiater sebelumnya?
                </p>
              </div>
              <div className="auth-field auth-field-inline" style={{ marginTop: "16px" }}>
                <div
                  role="group"
                  aria-label="Pilihan riwayat konsultasi"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}
                >
                  <button
                    type="button"
                    aria-pressed={form.hasPsychologistExp === true}
                    className={`button ${form.hasPsychologistExp === true ? "button-primary" : "button-secondary"}`}
                    style={{ minHeight: "44px", justifyContent: "center", borderRadius: "12px" }}
                    onClick={() => {
                      setForm((current) => ({ ...current, hasPsychologistExp: true }));
                      setFormError(null);
                    }}
                  >
                    Pernah
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.hasPsychologistExp === false}
                    className={`button ${form.hasPsychologistExp === false ? "button-primary" : "button-secondary"}`}
                    style={{ minHeight: "44px", justifyContent: "center", borderRadius: "12px" }}
                    onClick={() => {
                      setForm((current) => ({ ...current, hasPsychologistExp: false }));
                      setFormError(null);
                    }}
                  >
                    Belum Pernah
                  </button>
                </div>
                <button
                  type="button"
                  className="auth-inline-next"
                  aria-label="Lanjut ke detail keluhan"
                  onClick={clickHiddenNext}
                  disabled={!canContinue}
                >
                  <ArrowRight size={18} strokeWidth={2.4} />
                </button>
              </div>
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
                disabled={!canContinue || isSubmitting}
              >
                <Check size={16} />
                {isSubmitting ? "Mengirim..." : "Kirim Permintaan"}
              </button>
            </div>
          </Step>
        </Stepper>
      </div>
    </section>
  );
}
