"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, LayoutDashboard, LogOut, UserRound, ArrowLeftRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isAdminRole, useAuth } from "./auth/auth-provider";
import { navItems } from "./data";
import StartCounselingModal from "./StartCounselingModal";


export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, actualRole, switchRole } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const firstName = user?.fullName.trim().split(" ")[0] || "Mahasiswa";
  const isAdmin = isAdminRole(user?.role);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("login") === "true" && !user) {
        setIsLoginModalOpen(true);
        const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]login=[^&]+/, "").replace(/^[?&]/, "?");
        window.history.replaceState({}, document.title, cleanUrl === "?" ? window.location.pathname : cleanUrl);
      }
    }
  }, [user, pathname]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current) return;
      if (accountMenuRef.current.contains(event.target as Node)) return;
      setIsAccountMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isAccountMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <>


      <nav className="nav-desktop">
        <div
          className={`nav-desktop-side ${isScrolled ? "nav-desktop-side-hidden nav-desktop-side-left" : ""
            }`}
        >
          <Link className="brand-mark" href="/">
            <Image
              src="/branding/logo-konseling.png"
              alt="Logo Konseling"
              width={64}
              height={64}
              className="brand-logo"
              priority
            />
            <div>
              <p>Layanan Konseling</p>
              <span>Universitas Brawijaya</span>
            </div>
          </Link>
        </div>

        <div className="nav-desktop-center">
          <div className={`glass nav nav-panel ${isScrolled ? "nav-scrolled" : ""}`}>
            <div className={`nav-links ${isScrolled ? "nav-links-scrolled" : ""}`}>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-desktop-link ${isActive ? "nav-link-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={`nav-desktop-side nav-desktop-action ${isScrolled ? "nav-desktop-side-hidden nav-desktop-side-right" : ""
            }`}
        >
          {user ? (
            <div className="nav-account-wrap" ref={accountMenuRef}>
              <button
                type="button"
                className="nav-account-trigger"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                aria-expanded={isAccountMenuOpen}
              >
                <UserRound size={16} />
                Hi, {firstName}
              </button>

              <div className={`nav-account-menu glass ${isAccountMenuOpen ? "nav-account-menu-open" : ""}`}>
                {isAdmin ? (
                  <Link
                    href="/admin/dashboard"
                    className="nav-account-link"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/my-counseling"
                    className="nav-account-link"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    <CircleUserRound size={16} />
                    Konseling Saya
                  </Link>
                )}
                {actualRole && (actualRole === "admin" || actualRole === "superadmin") && (
                  <button
                    type="button"
                    className="nav-account-link"
                    onClick={() => {
                      window.dispatchEvent(new Event("trigger-page-loader"));
                      setIsAccountMenuOpen(false);
                      setTimeout(() => {
                        if (isAdmin) {
                          switchRole("student");
                          window.location.href = "/my-counseling";
                        } else {
                          switchRole(actualRole);
                          window.location.href = "/admin/dashboard";
                        }
                      }, 250);
                    }}
                  >
                    <ArrowLeftRight size={16} />
                    {isAdmin ? "Beralih ke Mhs" : "Beralih ke Admin"}
                  </button>
                )}
                <button
                  type="button"
                  className="nav-account-logout"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="nav-desktop-cta"
              onClick={() => setIsLoginModalOpen(true)}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <nav className="nav-mobile-bar">
        <div className="nav-mobile-brand-wrap">
          <Link className="brand-mark nav-mobile-brand" href="/">
            <Image
              src="/branding/logo-konseling.png"
              alt="Logo Konseling"
              width={56}
              height={56}
              className="brand-logo"
              priority
            />
            <div>
              <p>Layanan Konseling</p>
              <span>Universitas Brawijaya</span>
            </div>
          </Link>
        </div>

        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          <span className={isMobileMenuOpen ? "nav-toggle-line nav-toggle-open-top" : "nav-toggle-line"} />
          <span className={isMobileMenuOpen ? "nav-toggle-line nav-toggle-open-middle" : "nav-toggle-line"} />
          <span className={isMobileMenuOpen ? "nav-toggle-line nav-toggle-open-bottom" : "nav-toggle-line"} />
        </button>
      </nav>

      <div
        className={`mobile-menu-backdrop ${isMobileMenuOpen ? "mobile-menu-open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div className={`mobile-menu glass ${isMobileMenuOpen ? "mobile-menu-open" : ""}`}>
        <div className="mobile-menu-links">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "mobile-link-active" : ""}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {user ? (
          <div className="mobile-account-panel">
            <p className="mobile-account-title">Hi, {firstName}</p>
            <div className="mobile-account-links">
              {isAdmin ? (
                <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                  Dashboard
                </Link>
              ) : (
                <Link href="/my-counseling" onClick={() => setIsMobileMenuOpen(false)}>
                  Konseling Saya
                </Link>
              )}
              {actualRole && (actualRole === "admin" || actualRole === "superadmin") && (
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 0",
                    background: "none",
                    border: "none",
                    color: "inherit",
                    font: "inherit",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                  onClick={() => {
                    window.dispatchEvent(new Event("trigger-page-loader"));
                    setIsMobileMenuOpen(false);
                    setTimeout(() => {
                      if (isAdmin) {
                        switchRole("student");
                        window.location.href = "/my-counseling";
                      } else {
                        switchRole(actualRole);
                        window.location.href = "/admin/dashboard";
                      }
                    }, 250);
                  }}
                >
                  <ArrowLeftRight size={16} />
                  {isAdmin ? "Beralih ke Mhs" : "Beralih ke Admin"}
                </button>
              )}
            </div>
            <button
              type="button"
              className="button button-secondary mobile-menu-cta"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button button-primary mobile-menu-cta"
            style={{ textAlign: 'center', cursor: 'pointer' }}
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsLoginModalOpen(true);
            }}
          >
            Login
          </button>
        )}
      </div>

      <StartCounselingModal
        open={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
