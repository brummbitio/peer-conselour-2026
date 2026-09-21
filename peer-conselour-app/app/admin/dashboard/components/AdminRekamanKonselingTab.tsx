"use client";

import React, { useState } from "react";
import { BASE_URL } from "@/utils/api";
import { Search, Plus, Trash2, Edit2, Calendar, Clock, User, FileText, X } from "lucide-react";

interface RekamanKonseling {
  id: number;
  client_nim: string;
  client_name: string;
  counselor_email: string;
  session_number: number;
  session_date: string;
  duration_minutes: number;
  observation_notes: string;
  intervention_plan: string;
  status: string;
}

export default function AdminRekamanKonselingTab() {
  const [searchNIM, setSearchNIM] = useState("");
  const [records, setRecords] = useState<RekamanKonseling[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const initialFormState = {
    client_nim: "",
    client_name: "",
    session_date: new Date().toISOString().split("T")[0],
    duration_minutes: 60,
    observation_notes: "",
    intervention_plan: "",
    status: "Konseling Berjalan",
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchRecords = async (nim: string) => {
    if (!nim.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/rekaman-konseling?nim=${encodeURIComponent(nim)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords(searchNIM.trim());
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      ...initialFormState,
      client_nim: searchNIM.trim() || "",
      client_name: records.length > 0 ? records[0].client_name : "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (record: RekamanKonseling) => {
    setEditingId(record.id);
    setFormData({
      client_nim: record.client_nim,
      client_name: record.client_name,
      session_date: record.session_date ? record.session_date.split("T")[0] : "",
      duration_minutes: record.duration_minutes || 60,
      observation_notes: record.observation_notes || "",
      intervention_plan: record.intervention_plan || "",
      status: record.status || "Konseling Berjalan",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${BASE_URL}/api/rekaman-konseling/${editingId}`
        : `${BASE_URL}/api/rekaman-konseling`;
      
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setSearchNIM(formData.client_nim);
        fetchRecords(formData.client_nim);
        setFormData(initialFormState);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Gagal menyimpan rekaman konseling");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat menyimpan data");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus rekaman sesi ini? Data yang dihapus tidak akan ditampilkan lagi di riwayat.")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/rekaman-konseling/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert("Gagal menghapus rekaman konseling");
      }
    } catch {
      alert("Terjadi kesalahan jaringan saat menghapus data");
    }
  };

  return (
    <div className="admin-scroll-list">
      {/* Header & Tools Navigasi */}
      <div className="admin-tab-tools-admins">
        <form onSubmit={handleSearch} className="rekaman-search-form">
          <input
            type="text"
            className="admin-search-input"
            placeholder="Cari berdasarkan NIM mahasiswa..."
            value={searchNIM}
            onChange={(e) => setSearchNIM(e.target.value)}
          />
          <button type="submit" className="button rekaman-search-btn">
            <Search size={16} />
            <span>Cari</span>
          </button>
        </form>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="button button-primary"
        >
          <Plus size={16} />
          <span>Catat Sesi Baru</span>
        </button>
      </div>

      {/* Konten Utama */}
      {loading ? (
        <div className="admin-topic-card">
          <p className="admin-filter-current">Memverifikasi dan memuat rekaman sesi...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="admin-topic-card rekaman-empty-state">
          <FileText size={36} className="rekaman-empty-icon" />
          <h2 className="rekaman-empty-title">Belum Ada Data Terpilih</h2>
          <p className="rekaman-empty-desc">
            Masukkan NIM mahasiswa pada kolom pencarian di atas untuk meninjau riwayat rekaman konseling.
          </p>
        </div>
      ) : (
        <div className="admin-scroll-list">
          {/* Ringkasan Mahasiswa Klien */}
          <div className="admin-student-detail-card">
            <div className="admin-student-detail-header">
              <div>
                <span className="admin-student-detail-eyebrow">Rekam Medis Klien Terpilih</span>
                <h1 className="rekaman-client-title">{records[0].client_name}</h1>
              </div>
              <span className="admin-student-detail-nim">NIM: {records[0].client_nim}</span>
            </div>
            <div className="admin-admin-inline-meta">
              <p>Total Sesi: <strong>{records.length} Pertemuan</strong></p>
              <span className="admin-admin-inline-separator">•</span>
              <p>Status Kasus: <strong>{records[records.length - 1].status}</strong></p>
            </div>
          </div>

          {/* Daftar Riwayat Sesi */}
          <div className="admin-scroll-list admin-scroll-list-active">
            {records.map((item) => (
              <div key={item.id} className="admin-topic-card">
                <div className="admin-line-header">
                  <div className="admin-profile-identity-top">
                    <span className="admin-line-range">
                      <button type="button" className="is-active">
                        Sesi #{item.session_number}
                      </button>
                    </span>
                    <span
                      className={`rekaman-status-badge ${
                        item.status === "Selesai"
                          ? "rekaman-status-selesai"
                          : "rekaman-status-berjalan"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="rekaman-card-actions">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="admin-admin-edit-trigger"
                      title="Edit catatan sesi ini"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="admin-admin-edit-trigger rekaman-delete-btn"
                      title="Hapus catatan sesi ini"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="admin-admin-inline-meta">
                  <p>
                    <Calendar size={14} /> {item.session_date ? item.session_date.split("T")[0] : "-"}
                  </p>
                  <span className="admin-admin-inline-separator">•</span>
                  <p>
                    <Clock size={14} /> {item.duration_minutes} Menit
                  </p>
                  <span className="admin-admin-inline-separator">•</span>
                  <p>
                    <User size={14} /> Konselor: {item.counselor_email}
                  </p>
                </div>

                <div className="admin-student-detail-grid">
                  <div className="admin-student-detail-row admin-student-detail-row-wide">
                    <span>Catatan Observasi & Diagnosis</span>
                    <strong>{item.observation_notes}</strong>
                  </div>

                  {item.intervention_plan && (
                    <div className="admin-student-detail-row admin-student-detail-row-wide">
                      <span>Rencana Intervensi / Follow-Up</span>
                      <strong>{item.intervention_plan}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Dialog Form (Create / Edit) - Self Contained */}
      {showModal && (
        <div className="rekaman-modal-overlay">
          <button
            type="button"
            className="rekaman-modal-backdrop"
            onClick={() => setShowModal(false)}
            aria-label="Tutup modal"
          />
          <div className="rekaman-modal-dialog">
            <div className="rekaman-modal-header">
              <h2>{editingId ? "Perbarui Rekaman Konseling" : "Catat Sesi Rekaman Konseling"}</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="admin-admin-edit-trigger"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="admin-add-form">
              <div className="student-profile-form-row">
                <div className="admin-add-field">
                  <span>NIM Mahasiswa</span>
                  <input
                    type="text"
                    required
                    disabled={editingId !== null}
                    className="admin-search-input"
                    value={formData.client_nim}
                    onChange={(e) => setFormData({ ...formData, client_nim: e.target.value })}
                  />
                </div>
                <div className="admin-add-field">
                  <span>Nama Mahasiswa</span>
                  <input
                    type="text"
                    required
                    disabled={editingId !== null}
                    className="admin-search-input"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="student-profile-form-row">
                <div className="admin-add-field">
                  <span>Tanggal Sesi</span>
                  <input
                    type="date"
                    required
                    disabled={editingId !== null}
                    className="admin-search-input"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                  />
                </div>
                <div className="admin-add-field">
                  <span>Durasi (Menit)</span>
                  <input
                    type="number"
                    className="admin-search-input"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="admin-add-field">
                <span>Status Konseling</span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Misal: Konseling Berjalan, Selesai, Dirujuk"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                />
              </div>

              <div className="admin-add-field">
                <span>Catatan Observasi</span>
                <textarea
                  required
                  rows={3}
                  className="admin-search-input rekaman-textarea"
                  value={formData.observation_notes}
                  onChange={(e) => setFormData({ ...formData, observation_notes: e.target.value })}
                />
              </div>

              <div className="admin-add-field">
                <span>Rencana Intervensi</span>
                <textarea
                  rows={2}
                  className="admin-search-input rekaman-textarea-sm"
                  value={formData.intervention_plan}
                  onChange={(e) => setFormData({ ...formData, intervention_plan: e.target.value })}
                />
              </div>

              <div className="admin-add-form-actions admin-add-form-actions-inline rekaman-modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="button"
                >
                  Batal
                </button>
                <button type="submit" className="button button-primary">
                  {editingId ? "Simpan Perubahan" : "Simpan Sesi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}