"use client";

import Link from "next/link";
import { memo, useDeferredValue, useMemo, useState } from "react";
import { ChevronRight, SearchX, Users } from "lucide-react";
import { CardScrollList } from "../../../_portal/CardScrollList";
import { EmptyState } from "../../../_portal/EmptyState";
import { Pagination } from "../../../_portal/Pagination";
import { getUserDisplayName } from "../../../_portal/types";
import type { ApiUserSummary } from "../../../_portal/types";
import { usePagination } from "../../../_portal/usePagination";

interface AdminStudentsTabProps {
  adminStudents: ApiUserSummary[];
}

type IndexedStudent = {
  student: ApiUserSummary;
  name: string;
  haystack: string;
};

const StudentListCard = memo(function StudentListCard({ student, name }: { student: ApiUserSummary; name: string }) {
  const meta = [student.gender, student.faculty].filter(Boolean).join(" • ");

  return (
    <article className="admin-student-card">
      <div className="admin-student-card-main">
        <h2>{name || "-"}</h2>
        <p className="admin-student-meta">{meta || "-"}</p>
      </div>
      <Link
        href={`/admin/students/${student.id}`}
        className="my-counseling-arrow-link"
        aria-label={`Buka detail mahasiswa ${name}`}
      >
        <span className="my-counseling-arrow" aria-hidden="true">
          <ChevronRight size={20} />
        </span>
      </Link>
    </article>
  );
});

export function AdminStudentsTab({ adminStudents }: AdminStudentsTabProps) {
  const [studentQuery, setStudentQuery] = useState("");
  // Kata kunci ditunda (deferred): input tetap responsif saat memfilter ribuan mahasiswa.
  const deferredQuery = useDeferredValue(studentQuery);

  // Indeks pencarian dibangun sekali per perubahan data, bukan di setiap ketikan.
  const indexedStudents = useMemo<IndexedStudent[]>(
    () =>
      adminStudents.map((student) => {
        const name = getUserDisplayName(student);
        return { student, name, haystack: `${name} ${student.nim ?? ""}`.toLowerCase() };
      }),
    [adminStudents]
  );

  const filteredStudents = useMemo(() => {
    const query = deferredQuery.toLowerCase().trim();
    if (!query) return indexedStudents;
    return indexedStudents.filter((entry) => entry.haystack.includes(query));
  }, [indexedStudents, deferredQuery]);

  const { page, totalPages, totalItems, pageSize, pageItems, setPage } = usePagination(filteredStudents);

  return (
    <>
      <div className="admin-tab-tools">
        <input
          type="search"
          className="admin-search-input"
          placeholder="Cari nama atau NIM mahasiswa..."
          aria-label="Cari mahasiswa"
          value={studentQuery}
          onChange={(event) => {
            setStudentQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {filteredStudents.length === 0 ? (
        adminStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada data mahasiswa."
            description="Mahasiswa yang pernah masuk ke layanan konseling akan tampil di sini."
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="Mahasiswa tidak ditemukan."
            description="Coba kata kunci lain untuk mencari mahasiswa."
          />
        )
      ) : (
        <>
          <CardScrollList ariaLabel="Daftar mahasiswa" resetKey={page}>
            {pageItems.map(({ student, name }) => (
              <StudentListCard key={student.id} student={student} name={name} />
            ))}
          </CardScrollList>
          {/* Pagination Controller Mahasiswa */}
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            ariaLabel="Navigasi halaman daftar mahasiswa"
          />
        </>
      )}
    </>
  );
}
