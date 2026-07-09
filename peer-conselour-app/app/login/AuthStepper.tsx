"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { isAdminRole, useAuth } from "../auth/auth-provider";
import Stepper, { Step } from "../../src/componentcomponents/ui/Stepper.jsx";

type AuthMode = "login" | "register" | null;
type StepNavigationContext = { targetStep: number; currentStep: number };

type FormState = {
  nim: string;
  password: string;
  fullName: string;
  gender: string;
  faculty: string;
  department: string;
  email: string;
  phone: string;
};

const initialFormState: FormState = {
  nim: "",
  password: "",
  fullName: "",
  gender: "",
  faculty: "",
  department: "",
  email: "",
  phone: "",
};

const facultyOptions = [
  "Fakultas Hukum",
  "Fakultas Ekonomi dan Bisnis",
  "Fakultas Ilmu Administrasi",
  "Fakultas Pertanian",
  "Fakultas Peternakan",
  "Fakultas Teknik",
  "Fakultas Kedokteran",
  "Fakultas Perikanan dan Ilmu Kelautan",
  "Fakultas Matematika dan Ilmu Pengetahuan Alam",
  "Fakultas Teknologi Pertanian",
  "Fakultas Ilmu Sosial dan Ilmu Politik",
  "Fakultas Ilmu Budaya",
];

const genderOptions = ["Laki-laki", "Perempuan"];
const nimRegex = /^\d{8,20}$/;
const loginIdentifierRegex = /^(?:\d{8,20}|[^\s@]+@[^\s@]+\.[^\s@]{2,})$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const fullNameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'.\-\s]{3,}$/;
const departmentRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'.\-\s]{2,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{7,11}$/;

type AuthStepperProps = {
  variant?: "page" | "modal";
  onClose?: () => void;
  onAuthenticated?: () => void;
};

export default function AuthStepper({
  variant = "page",
  onClose,
  onAuthenticated,
}: AuthStepperProps) {
  const {
    user,
    isReady,
    login,
    register,
    demoCredentials,
    adminDemoCredentials,
    canLoginWithCredential,
    isNimAvailable,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && user && variant === "page") {
      if (isAdminRole(user.role)) {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/my-counseling");
      }
    }
  }, [isReady, user, variant, router]);

  const [mode, setMode] = useState<AuthMode>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [submittedMode, setSubmittedMode] = useState<AuthMode>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isGenderMenuOpen, setIsGenderMenuOpen] = useState(false);
  const [isFacultyMenuOpen, setIsFacultyMenuOpen] = useState(false);
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [bypassId, setBypassId] = useState("30");
  const isModal = variant === "modal";
  const genderMenuRef = useRef<HTMLDivElement>(null);
  const facultyMenuRef = useRef<HTMLDivElement>(null);

  const renderModalHeader = () =>
    isModal ? (
      <div className="auth-modal-header">
        <div className="auth-modal-brand">
          <Image
            src="/branding/logo-konseling.png"
            alt="Logo Layanan Konseling"
            width={42}
            height={42}
          />
          <div>
            <p>Layanan Konseling</p>
            <span>Universitas Brawijaya</span>
          </div>
        </div>
        <button
          type="button"
          className="auth-close"
          onClick={onClose}
          aria-label="Tutup login"
        >
          <span />
          <span />
        </button>
      </div>
    ) : null;

  const sanitizeInput = (field: keyof FormState, rawValue: string) => {
    if (field === "nim") {
      if (mode === "login") {
        return rawValue.trimStart();
      }
      return rawValue.replace(/\D/g, "").slice(0, 20);
    }

    if (field === "phone") {
      const digits = rawValue.replace(/\D/g, "").slice(0, 14);
      if (rawValue.trim().startsWith("+")) {
        return digits ? `+${digits}` : "";
      }
      return digits;
    }

    if (field === "fullName" || field === "department") {
      return rawValue
        .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'.\-\s]/g, "")
        .replace(/\s{2,}/g, " ")
        .trimStart();
    }

    if (field === "email") {
      return rawValue.trimStart();
    }

    return rawValue;
  };

  const updateField =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const sanitizedValue = sanitizeInput(field, event.target.value);
      setForm((current) => ({ ...current, [field]: sanitizedValue }));
      setAuthActionError(null);
    };

  useEffect(() => {
    if (mode !== "register" || currentStep !== 3) {
      setIsGenderMenuOpen(false);
    }
  }, [mode, currentStep]);

  useEffect(() => {
    if (mode !== "register" || currentStep !== 4) {
      setIsFacultyMenuOpen(false);
    }
  }, [mode, currentStep]);

  useEffect(() => {
    if (!isGenderMenuOpen && !isFacultyMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (genderMenuRef.current?.contains(target)) return;
      if (facultyMenuRef.current?.contains(target)) return;
      setIsGenderMenuOpen(false);
      setIsFacultyMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGenderMenuOpen(false);
        setIsFacultyMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isGenderMenuOpen, isFacultyMenuOpen]);

  const clickHiddenNext = () => {
    const hiddenNext = document.getElementById("auth-login-hidden-next");
    hiddenNext?.click();
  };

  const clickHiddenRegisterNext = () => {
    const hiddenNext = document.getElementById("auth-register-hidden-next");
    hiddenNext?.click();
  };

  const validation = useMemo(
    () => ({
      loginIdentifier: loginIdentifierRegex.test(form.nim.trim()),
      nim: nimRegex.test(form.nim),
      password: passwordRegex.test(form.password),
      fullName: fullNameRegex.test(form.fullName),
      gender: genderOptions.includes(form.gender),
      faculty: facultyOptions.includes(form.faculty),
      department: departmentRegex.test(form.department),
      email: emailRegex.test(form.email.trim()),
      phone: phoneRegex.test(form.phone.trim()),
    }),
    [
      form.department,
      form.email,
      form.faculty,
      form.fullName,
      form.gender,
      form.nim,
      form.password,
      form.phone,
    ]
  );

  const hasLoginCredentialMatch = useMemo(
    () =>
      validation.loginIdentifier &&
      validation.password &&
      canLoginWithCredential(form.nim, form.password),
    [
      canLoginWithCredential,
      form.nim,
      form.password,
      validation.loginIdentifier,
      validation.password,
    ]
  );

  const isNimAvailableForRegister = useMemo(
    () => (validation.nim ? isNimAvailable(form.nim) : true),
    [form.nim, isNimAvailable, validation.nim]
  );

  const loginCanContinue = useMemo(() => {
    if (currentStep === 1) return validation.loginIdentifier;
    if (currentStep === 2) return validation.password && hasLoginCredentialMatch;
    return false;
  }, [
    currentStep,
    hasLoginCredentialMatch,
    validation.loginIdentifier,
    validation.password,
  ]);

  const registerCanContinue = useMemo(() => {
    if (currentStep === 1) return validation.nim && isNimAvailableForRegister;
    if (currentStep === 2) return validation.fullName;
    if (currentStep === 3) return validation.gender;
    if (currentStep === 4) return validation.faculty;
    if (currentStep === 5) return validation.department;
    if (currentStep === 6) return validation.email;
    if (currentStep === 7) return validation.phone;
    return true;
  }, [
    currentStep,
    validation.department,
    validation.email,
    validation.faculty,
    validation.fullName,
    validation.gender,
    validation.nim,
    validation.phone,
    isNimAvailableForRegister,
  ]);

  const loginContentOverflow = "hidden";
  const registerContentOverflow =
    (currentStep === 3 && isGenderMenuOpen) ||
    (currentStep === 4 && isFacultyMenuOpen)
      ? "visible"
      : "hidden";

  const resetFlow = () => {
    setMode(null);
    setCurrentStep(1);
    setSubmittedMode(null);
    setForm(initialFormState);
    setAuthActionError(null);
    setIsGenderMenuOpen(false);
    setIsFacultyMenuOpen(false);
  };

  const handleLoginSubmit = () => {
    const result = login(form.nim, form.password);
    if (!result.ok) {
      setAuthActionError(result.message || "Gagal masuk.");
      return;
    }
    setSubmittedMode("login");
    if (onAuthenticated) {
      onAuthenticated();
    }
  };

  const handleSSOLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/sso`;
  };

  const handleBypassLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${apiUrl}/api/auth/dev-login?id=${bypassId}`;
  };

  const handleRegisterSubmit = () => {
    const result = register({
      nim: form.nim,
      fullName: form.fullName,
      gender: form.gender,
      faculty: form.faculty,
      department: form.department,
      email: form.email,
      phone: form.phone,
    });

    if (!result.ok) {
      setAuthActionError(result.message || "Pendaftaran belum berhasil.");
      return;
    }

    setAuthActionError(null);
    setSubmittedMode("register");
  };

  if (submittedMode) {
    const isRegister = submittedMode === "register";
    return (
      <section className={isModal ? "auth-page auth-page-modal" : "section site-width auth-page"}>
        <div className={`auth-card glass ${isModal ? "auth-card-modal auth-card-stepper" : ""}`}>
          {renderModalHeader()}
          <div className="auth-success-icon" aria-hidden="true">
            <Check size={28} />
          </div>
          <h2 className="auth-success-title">
            {submittedMode === "login" ? "Login Berhasil" : "Pendaftaran Berhasil"}
          </h2>
          <p className="auth-success-message">
            {submittedMode === "login"
              ? "Data login sudah terisi. Langkah berikutnya tinggal kita sambungkan ke backend autentikasi."
              : "Akun dummy tersimpan. Untuk sementara, password awal mengikuti NIM."}
          </p>
          <div className="auth-success-actions">
            <button type="button" className="button button-primary" onClick={resetFlow}>
              Kembali ke Pilihan Awal
            </button>
            {isModal && onClose ? (
              <button type="button" className="button button-secondary" onClick={onClose}>
                Tutup
              </button>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (!mode) {
    return (
      <section className={isModal ? "auth-page auth-page-modal" : "section site-width auth-page"}>
        <div className={`auth-card glass ${isModal ? "auth-card-modal auth-card-stepper auth-card-intro" : ""}`}>
          {renderModalHeader()}
          <div className="auth-intro-content">
            <h3 className="auth-intro-title">Selamat Datang</h3>
            <div className="auth-intro-actions" style={{ flexDirection: "column", gap: "16px" }}>
              <button
                type="button"
                className="button button-primary auth-choice-button"
                onClick={handleSSOLogin}
                style={{ width: "100%", justifyContent: "center", display: "flex", gap: "8px" }}
              >
                <span>Masuk dengan SSO UB</span>
              </button>

              <div style={{ width: "100%", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px", marginTop: "8px" }}>
                <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "8px" }}>
                  — Khusus Pengembang (Local Development Bypass) —
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <input
                    type="number"
                    value={bypassId}
                    onChange={(e) => setBypassId(e.target.value)}
                    placeholder="User ID (e.g. 30)"
                    style={{
                      width: "120px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(0,0,0,0.2)",
                      color: "#fff",
                      fontSize: "14px"
                    }}
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleBypassLogin}
                    style={{ fontSize: "14px" }}
                  >
                    Bypass Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={isModal ? "auth-page auth-page-modal" : "section site-width auth-page"}>
      <div className={`auth-card glass ${isModal ? "auth-card-modal auth-card-stepper" : ""}`}>
        {renderModalHeader()}
        {mode === "login" ? (
          <Stepper
            key="login-stepper"
            initialStep={1}
            onStepChange={setCurrentStep}
            onFinalStepCompleted={handleLoginSubmit}
            renderStepIndicator={undefined}
            canNavigateToStep={({ targetStep, currentStep: stepNow }: StepNavigationContext) =>
              targetStep < stepNow
            }
            nextButtonText="Next"
            completeButtonText="Login"
            nextButtonProps={{
              id: "auth-login-hidden-next",
              disabled: !loginCanContinue,
            }}
            backButtonText="Previous"
            stepCircleContainerClassName="auth-stepper-shell"
            stepContainerClassName="auth-stepper-track"
            contentClassName="auth-stepper-content"
            contentOverflow={loginContentOverflow}
            footerClassName="auth-stepper-footer auth-stepper-footer-hidden"
          >
            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <h3>Masukkan NIM atau Email</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <input
                    type="text"
                    value={form.nim}
                    onChange={updateField("nim")}
                    placeholder="Masukkan NIM atau email admin"
                  />
                  <button
                    type="button"
                    className="auth-inline-next"
                    aria-label="Lanjut ke password"
                    onClick={clickHiddenNext}
                    disabled={!loginCanContinue}
                  >
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                  {form.nim && !validation.loginIdentifier ? (
                    <p className="auth-field-inline-message">
                      Gunakan NIM (8-20 digit) atau format email yang valid.
                    </p>
                  ) : null}
                </label>
              </div>
            </Step>

            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <span>Step 2</span>
                  <h3>Masukkan password</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <input
                    type="password"
                    value={form.password}
                    onChange={updateField("password")}
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    className="auth-inline-next auth-inline-submit"
                    aria-label="Submit login"
                    onClick={clickHiddenNext}
                    disabled={!loginCanContinue}
                  >
                    <Check size={18} strokeWidth={2.6} />
                  </button>
                  {form.password && !validation.password ? (
                    <p className="auth-field-inline-message">
                      Password minimal 8 karakter, wajib huruf dan angka.
                    </p>
                  ) : null}
                  {validation.loginIdentifier &&
                  validation.password &&
                  !hasLoginCredentialMatch ? (
                    <p className="auth-field-inline-message">
                      NIM/email atau password akun dummy belum cocok.
                    </p>
                  ) : null}
                  {authActionError ? (
                    <p className="auth-field-inline-message">{authActionError}</p>
                  ) : null}
                </label>
              </div>
            </Step>
          </Stepper>
        ) : (
          <Stepper
            key="register-stepper"
            initialStep={1}
            onStepChange={setCurrentStep}
            onFinalStepCompleted={handleRegisterSubmit}
            renderStepIndicator={undefined}
            canNavigateToStep={({ targetStep, currentStep: stepNow }: StepNavigationContext) =>
              targetStep < stepNow
            }
            nextButtonText="Next"
            completeButtonText="Daftar"
            nextButtonProps={{
              id: "auth-register-hidden-next",
              disabled: !registerCanContinue,
            }}
            backButtonText="Previous"
            stepCircleContainerClassName="auth-stepper-shell"
            stepContainerClassName="auth-stepper-track"
            contentClassName="auth-stepper-content"
            contentOverflow={registerContentOverflow}
            footerClassName="auth-stepper-footer auth-stepper-footer-hidden"
          >
            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <h3>Masukkan NIM</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <input
                    type="text"
                    value={form.nim}
                    onChange={updateField("nim")}
                    inputMode="numeric"
                    maxLength={20}
                    placeholder="Masukkan NIM mahasiswa"
                  />
                  <button
                    type="button"
                    className="auth-inline-next"
                    aria-label="Lanjut ke nama lengkap"
                    onClick={clickHiddenRegisterNext}
                    disabled={!registerCanContinue}
                  >
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                  {form.nim && !validation.nim ? (
                    <p className="auth-field-inline-message">
                      NIM wajib angka (8-20 digit).
                    </p>
                  ) : null}
                  {validation.nim && !isNimAvailableForRegister ? (
                    <p className="auth-field-inline-message">
                      NIM sudah terdaftar, langsung login saja.
                    </p>
                  ) : null}
                </label>
              </div>
            </Step>

            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <h3>Masukkan nama lengkap</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={updateField("fullName")}
                    maxLength={80}
                    placeholder="Masukkan nama lengkap"
                  />
                  <button
                    type="button"
                    className="auth-inline-next"
                    aria-label="Lanjut ke jenis kelamin"
                    onClick={clickHiddenRegisterNext}
                    disabled={!registerCanContinue}
                  >
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                  {form.fullName && !validation.fullName ? (
                    <p className="auth-field-inline-message">
                      Nama harus huruf saja dan minimal 3 karakter.
                    </p>
                  ) : null}
                </label>
              </div>
            </Step>

            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <h3>Pilih jenis kelamin</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <div
                    ref={genderMenuRef}
                    className={`auth-custom-select ${isGenderMenuOpen ? "auth-custom-select-open" : ""}`}
                  >
                    <button
                      type="button"
                      className={`auth-select-trigger ${form.gender ? "auth-select-has-value" : ""}`}
                      onClick={() => setIsGenderMenuOpen((current) => !current)}
                      aria-expanded={isGenderMenuOpen}
                      aria-haspopup="listbox"
                    >
                      <span>{form.gender || "Pilih jenis kelamin"}</span>
                      <ChevronDown size={18} className="auth-select-chevron" />
                    </button>

                    {isGenderMenuOpen ? (
                      <div className="auth-select-menu" role="listbox" aria-label="Pilih jenis kelamin">
                        {genderOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="option"
                            aria-selected={form.gender === option}
                            className={`auth-select-option ${form.gender === option ? "auth-select-option-active" : ""}`}
                            onClick={() => {
                              setForm((current) => ({ ...current, gender: option }));
                              setIsGenderMenuOpen(false);
                              setAuthActionError(null);
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
                    aria-label="Lanjut ke fakultas"
                    onClick={clickHiddenRegisterNext}
                    disabled={!registerCanContinue}
                  >
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                  {!validation.gender && currentStep === 3 ? (
                    <p className="auth-field-inline-message">
                      Pilih jenis kelamin terlebih dahulu.
                    </p>
                  ) : null}
                </label>
              </div>
            </Step>

            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <h3>Pilih fakultas</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <div
                    ref={facultyMenuRef}
                    className={`auth-custom-select ${isFacultyMenuOpen ? "auth-custom-select-open" : ""}`}
                  >
                    <button
                      type="button"
                      className={`auth-select-trigger ${form.faculty ? "auth-select-has-value" : ""}`}
                      onClick={() => setIsFacultyMenuOpen((current) => !current)}
                      aria-expanded={isFacultyMenuOpen}
                      aria-haspopup="listbox"
                    >
                      <span>{form.faculty || "Pilih fakultas"}</span>
                      <ChevronDown size={18} className="auth-select-chevron" />
                    </button>

                    {isFacultyMenuOpen ? (
                      <div
                        className="auth-select-menu auth-select-menu-2rows"
                        role="listbox"
                        aria-label="Pilih fakultas"
                      >
                        {facultyOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="option"
                            aria-selected={form.faculty === option}
                            className={`auth-select-option ${form.faculty === option ? "auth-select-option-active" : ""}`}
                            onClick={() => {
                              setForm((current) => ({ ...current, faculty: option }));
                              setIsFacultyMenuOpen(false);
                              setAuthActionError(null);
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
                    aria-label="Lanjut ke jurusan"
                    onClick={clickHiddenRegisterNext}
                    disabled={!registerCanContinue}
                  >
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                  {!validation.faculty && currentStep === 4 ? (
                    <p className="auth-field-inline-message">
                      Pilih fakultas dari daftar.
                    </p>
                  ) : null}
                </label>
              </div>
            </Step>

            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <h3>Masukkan jurusan</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <input
                    type="text"
                    value={form.department}
                    onChange={updateField("department")}
                    maxLength={80}
                    placeholder="Masukkan jurusan"
                  />
                  <button
                    type="button"
                    className="auth-inline-next"
                    aria-label="Lanjut ke email"
                    onClick={clickHiddenRegisterNext}
                    disabled={!registerCanContinue}
                  >
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                  {form.department && !validation.department ? (
                    <p className="auth-field-inline-message">
                      Jurusan hanya huruf dan minimal 2 karakter.
                    </p>
                  ) : null}
                </label>
              </div>
            </Step>

            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <h3>Masukkan email</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <input
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    placeholder="Masukkan alamat email"
                  />
                  <button
                    type="button"
                    className="auth-inline-next"
                    aria-label="Lanjut ke nomor HP"
                    onClick={clickHiddenRegisterNext}
                    disabled={!registerCanContinue}
                  >
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </button>
                  {form.email && !validation.email ? (
                    <p className="auth-field-inline-message">
                      Format email tidak valid.
                    </p>
                  ) : null}
                </label>
              </div>
            </Step>

            <Step>
              <div className="auth-step-pane">
                <div className="auth-step-heading">
                  <h3>Masukkan nomor HP</h3>
                </div>
                <label className="auth-field auth-field-inline">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={updateField("phone")}
                    inputMode="tel"
                    maxLength={16}
                    placeholder="Masukkan nomor HP"
                  />
                  <button
                    type="button"
                    className="auth-inline-next auth-inline-submit"
                    aria-label="Submit pendaftaran"
                    onClick={clickHiddenRegisterNext}
                    disabled={!registerCanContinue}
                  >
                    <Check size={18} strokeWidth={2.6} />
                  </button>
                  {form.phone && !validation.phone ? (
                    <p className="auth-field-inline-message">
                      Gunakan format 08..., 62..., atau +62....
                    </p>
                  ) : null}
                  {authActionError ? (
                    <p className="auth-field-inline-message">{authActionError}</p>
                  ) : null}
                </label>
              </div>
            </Step>
          </Stepper>
        )}
      </div>
    </section>
  );
}
