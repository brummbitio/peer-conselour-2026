"use client";

import React, { useState } from "react";
import { BASE_URL } from "@/utils/api";
import { Search, Plus, Trash2, Calendar, Clock, User, FileText, X } from "lucide-react";

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

  const [formData, setFormData] = useState({
    client_nim: "",
    client_name: "",
    session_date: new Date().toISOString().split("T")[0],
    duration_minutes: 60,
    observation_notes: "",
    intervention_plan: "",
    status: "Konseling Berjalan",
  });

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/api/rekaman-konseling`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setSearchNIM(formData.client_nim);
        fetchRecords(formData.client_nim);
        setFormData({
          client_nim: "",
          client_name: "",
          session_date: new Date().toISOString().split("T")[0],
          duration_minutes: 60,
          observation_notes: "",
          intervention_plan: "",
          status: "Konseling Berjalan",
        });
      } else {
        alert("Gagal menyimpan data rekaman konseling");
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus rekaman sesi ini?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/rekaman-konseling/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      alert("Gagal menghapus rekaman");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Tab */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rekaman Konseling</h2>
          <p className="text-xs text-gray-500 mt-0.5">Catatan sesi, diagnosis/observasi klinis, dan rencana tindak lanjut.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Catat Sesi Baru / Follow-up
        </button>
      </div>

      {/* Bar Pencarian NIM */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan NIM mahasiswa..."
            value={searchNIM}
            onChange={(e) => setSearchNIM(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-medium transition"
        >
          Cari
        </button>
      </form>

      {/* Konten Riwayat */}
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400">Memuat data sesi...</div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
          Masukkan NIM mahasiswa di atas untuk menampilkan riwayat rekaman konseling.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Klien Terpilih</span>
              <h3 className="text-base font-bold text-gray-900">{records[0].client_name} ({records[0].client_nim})</h3>
            </div>
            <span className="text-xs px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded-full font-semibold">
              {records.length} Sesi Terdata
            </span>
          </div>

          <div className="grid gap-3">
            {records.map((item) => (
              <div key={item.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-800">
                      Sesi #{item.session_number}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                      {item.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {item.session_date.split("T")[0]}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {item.duration_minutes} Menit</span>
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Konselor: {item.counselor_email}</span>
                </div>

                <div className="space-y-2 border-t border-gray-50 pt-2 text-xs">
                  <div>
                    <h4 className="font-semibold text-gray-700 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-500" /> Catatan Observasi
                    </h4>
                    <p className="mt-1 text-gray-600 bg-gray-50 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                      {item.observation_notes}
                    </p>
                  </div>
                  {item.intervention_plan && (
                    <div>
                      <h4 className="font-semibold text-gray-700">Rencana Intervensi / Follow-Up</h4>
                      <p className="mt-1 text-gray-600 bg-gray-50 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                        {item.intervention_plan}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Catat Sesi */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900">Catat Sesi Rekaman Konseling</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">NIM Mahasiswa</label>
                  <input
                    type="text"
                    required
                    value={formData.client_nim}
                    onChange={(e) => setFormData({ ...formData, client_nim: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Nama Mahasiswa</label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tanggal Sesi</label>
                  <input
                    type="date"
                    required
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Catatan Observasi</label>
                <textarea
                  required
                  rows={3}
                  value={formData.observation_notes}
                  onChange={(e) => setFormData({ ...formData, observation_notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Rencana Intervensi</label>
                <textarea
                  rows={2}
                  value={formData.intervention_plan}
                  onChange={(e) => setFormData({ ...formData, intervention_plan: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}