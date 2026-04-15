"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdminRole, useAuth } from "../../../auth/auth-provider";
import { getStudentById } from "../../../tickets/mock-data";

export default function StudentDetailClient({ studentId }: { studentId: string }) {
  const { user } = useAuth();
  const student = getStudentById(studentId);

  if (!user) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Detail Mahasiswa</h1>
          <p>Login sebagai admin untuk melihat profil mahasiswa.</p>
          <Link href="/" className="button button-primary">
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    );
  }

  if (!isAdminRole(user.role)) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Akses Terbatas</h1>
          <p>Halaman ini hanya untuk admin layanan konseling.</p>
          <Link href="/my-counseling" className="button button-primary">
            Kembali ke Konseling Saya
          </Link>
        </div>
      </section>
    );
  }

  if (!student) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Mahasiswa tidak ditemukan</h1>
          <p>Data mahasiswa dengan ID ini belum tersedia.</p>
          <Link href="/admin/dashboard" className="button button-primary">
            Kembali ke Dashboard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section site-width account-page">
      <div className="ticket-detail-top">
        <Link href="/admin/dashboard" className="ticket-back-link">
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>
      </div>

      <article className="admin-student-detail-card">
        <header className="admin-student-detail-header">
          <div>
            <h1>{student.fullName}</h1>
          </div>
          <span className="admin-student-detail-nim">{student.nim}</span>
        </header>

        <div className="admin-student-detail-grid">
          <div className="admin-student-detail-row">
            <span>Jenis Kelamin</span>
            <strong>{student.gender}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Fakultas</span>
            <strong>{student.faculty}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Jurusan</span>
            <strong>{student.department}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Alamat Email</span>
            <strong>{student.email}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Nomor HP</span>
            <strong>{student.phone}</strong>
          </div>
          <div className="admin-student-detail-row">
            <span>Asal Daerah</span>
            <strong>{student.originRegion}</strong>
          </div>
          <div className="admin-student-detail-row admin-student-detail-row-wide">
            <span>Alamat di Malang</span>
            <strong>{student.malangAddress}</strong>
          </div>
        </div>
      </article>
    </section>
  );
}
