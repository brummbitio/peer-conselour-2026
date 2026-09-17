"use client";

import React, { useState } from "react";
import { BASE_URL } from "@/utils/api";
import { Search, Plus, Trash2, Calendar, Clock, User, FileText } from "lucide-react";

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

export default function RekamanKonselingPage() {
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
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/rekaman-konseling?nim=${nim}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchNIM.trim()) fetchRecords(searchNIM.trim());
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
      } else {
        alert("Gagal menyimpan rekaman");
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus catatan sesi ini?")) return;
    const res = await fetch(`${BASE_URL}/api/rekaman-konseling/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rekaman Konseling</h1>
          <p className="text-sm text-gray-500">Pencatatan sesi, asesmen, dan rencana tindak lanjut klien.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Catat Sesi Baru / Follow-up
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari NIM Mahasiswa..."
            value={searchNIM}
            onChange={(e) => setSearchNIM(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
          Cari
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Memuat riwayat sesi...</p>
      ) : records.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl text-gray-400 text-sm">
          Belum ada rekaman sesi untuk ditampilkan. Masukkan NIM untuk meninjau data.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase">Klien Terdaftar</p>
              <h2 className="text-lg font-bold text-gray-900">{records[0].client_name} ({records[0].client_nim})</h2>
            </div>
            <span className="text-xs px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded-full font-medium">
              Total {records.length} Sesi
            </span>
          </div>

          <div className="grid gap-4">
            {records.map((item) => (
              <div key={item.id} className="p-5 bg-white border border-gray-200 rounded-xl space-y-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 rounded">
                      Sesi #{item.session_number}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                      {item.status}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {item.session_date.split("T")[0]}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.duration_minutes} Menit</span>
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {item.counselor_email}</span>
                </div>

                <div className="space-y-2 text-sm border-t pt-2">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" /> Catatan Observasi
                    </h3>
                    <p className="mt-1 text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                      {item.observation_notes}
                    </p>
                  </div>
                  {item.intervention_plan && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-700">Rencana Intervensi / Follow-Up</h3>
                      <p className="mt-1 text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
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

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Catat Sesi Rekaman Konseling</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">NIM Mahasiswa</label>
                  <input
                    type="text"
                    required
                    value={formData.client_nim}
                    onChange={(e) => setFormData({ ...formData, client_nim: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Mahasiswa</label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Sesi</label>
                  <input
                    type="date"
                    required
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Observasi</label>
                <textarea
                  required
                  rows={3}
                  value={formData.observation_notes}
                  onChange={(e) => setFormData({ ...formData, observation_notes: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rencana Intervensi</label>
                <textarea
                  rows={2}
                  value={formData.intervention_plan}
                  onChange={(e) => setFormData({ ...formData, intervention_plan: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
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