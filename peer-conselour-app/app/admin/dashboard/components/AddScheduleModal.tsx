"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronDown, CalendarDays } from "lucide-react";
import { api } from "@/utils/api";
import { PortalModal } from "../../../_portal/PortalModal";
import { DateTimePanel } from "@/components/application/date-picker/date-time-panel";
import { formatScheduleDateLabel, formatScheduleTimeDisplay } from "../types";
import type { AddScheduleMenu, CounselingScheduleItem } from "../types";

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminStudents: any[];
  adminAccounts: any[];
  scheduleColumns: any[];
  onSuccess: () => void;
}

export function AddScheduleModal({
  isOpen,
  onClose,
  adminStudents,
  adminAccounts,
  scheduleColumns,
  onSuccess,
}: AddScheduleModalProps) {
  // States
  const [addScheduleClientId, setAddScheduleClientId] = useState("");
  const [scheduleClientSearchQuery, setScheduleClientSearchQuery] = useState("");
  const [scheduleHandlerSearchQuery, setScheduleHandlerSearchQuery] = useState("");
  const [addScheduleDateValue, setAddScheduleDateValue] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [addScheduleTimeValue, setAddScheduleTimeValue] = useState("09:00");
  const [addScheduleHandlerName, setAddScheduleHandlerName] = useState("");
  const [addScheduleServiceType, setAddScheduleServiceType] =
    useState<CounselingScheduleItem["serviceType"]>("tatap_muka");
  const [activeAddScheduleMenu, setActiveAddScheduleMenu] =
    useState<AddScheduleMenu>(null);
  const [addScheduleError, setAddScheduleError] = useState("");

  // Options
  const scheduleClientOptions = useMemo(
    () =>
      adminStudents.map((student) => ({
        id: String(student.id),
        label: student.full_name || student.fullName,
        meta: student.nim,
      })),
    [adminStudents]
  );

  const scheduleHandlerOptions = useMemo(() => {
    const options = new Set<string>();
    adminAccounts.forEach((account) => {
      if (account.fullName) options.add(account.fullName);
    });
    scheduleColumns.forEach((column) => {
      column.items.forEach((item: any) => {
        if (item.handlerName) options.add(item.handlerName);
      });
    });
    return Array.from(options);
  }, [adminAccounts, scheduleColumns]);

  // Set default client on open
  useEffect(() => {
    if (isOpen && scheduleClientOptions.length > 0 && !addScheduleClientId) {
      setAddScheduleClientId(scheduleClientOptions[0]?.id ?? "");
    }
  }, [isOpen, scheduleClientOptions, addScheduleClientId]);

  // Filtered Options
  const filteredScheduleClientOptions = useMemo(() => {
    const query = scheduleClientSearchQuery.toLowerCase().trim();
    if (!query) return scheduleClientOptions;
    return scheduleClientOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        (option.meta && option.meta.toLowerCase().includes(query))
    );
  }, [scheduleClientOptions, scheduleClientSearchQuery]);

  const filteredScheduleHandlerOptions = useMemo(() => {
    const query = scheduleHandlerSearchQuery.toLowerCase().trim();
    if (!query) return scheduleHandlerOptions;
    return scheduleHandlerOptions.filter((name) =>
      name.toLowerCase().includes(query)
    );
  }, [scheduleHandlerOptions, scheduleHandlerSearchQuery]);

  // Body scroll lock, portal, Escape, dan animasi ditangani PortalModal.

  const submitSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedClient = scheduleClientOptions.find((option) => option.id === addScheduleClientId);
    if (!selectedClient || !addScheduleHandlerName) {
      setAddScheduleError("Lengkapi klien dan penangan terlebih dahulu.");
      return;
    }

    const matchedCounselor = adminAccounts.find(
      (acc) => acc.fullName === addScheduleHandlerName
    );
    if (!matchedCounselor) {
      setAddScheduleError("Pilih penanggung jawab yang valid.");
      return;
    }

    try {
      await api.post("/api/admin/schedules", {
        client_name: selectedClient.label,
        date_value: addScheduleDateValue,
        time_value: addScheduleTimeValue,
        handler_id: Number(matchedCounselor.nim),
        service_type: addScheduleServiceType,
      });

      setAddScheduleError("");
      setAddScheduleClientId("");
      setScheduleClientSearchQuery("");
      setScheduleHandlerSearchQuery("");
      setAddScheduleHandlerName("");
      setActiveAddScheduleMenu(null);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Gagal menambahkan jadwal:", err);
      setAddScheduleError("Gagal menambahkan jadwal ke server.");
    }
  };

  return (
    <PortalModal
      open={isOpen}
      onClose={onClose}
      title="Tambah Jadwal"
      size="lg"
      panelClassName="admin-schedule-add-panel"
    >
        <form className="admin-add-form" onSubmit={submitSchedule}>
          <div className="admin-add-field student-profile-dropdown">
            <span>Klien</span>
            <button
              type="button"
              className={`student-profile-dropdown-trigger ${
                activeAddScheduleMenu === "client" ? "is-open" : ""
              }`}
              onClick={() =>
                setActiveAddScheduleMenu((previous) =>
                  previous === "client" ? null : "client"
                )
              }
            >
              <strong>
                {scheduleClientOptions.find((option) => option.id === addScheduleClientId)?.label ??
                  "Pilih klien"}
              </strong>
              <ChevronDown size={16} />
            </button>
            {activeAddScheduleMenu === "client" ? (
              <div className="student-profile-dropdown-menu dropdown-menu-searchable">
                <div className="dropdown-search-wrapper">
                  <input
                    type="text"
                    className="dropdown-search-input"
                    placeholder="Cari nama atau NIM..."
                    value={scheduleClientSearchQuery}
                    onChange={(e) => setScheduleClientSearchQuery(e.target.value)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="dropdown-options-list">
                  {filteredScheduleClientOptions.length > 0 ? (
                    filteredScheduleClientOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`student-profile-dropdown-option ${
                          option.id === addScheduleClientId ? "is-active" : ""
                        }`}
                        onClick={() => {
                          setAddScheduleClientId(option.id);
                          setActiveAddScheduleMenu(null);
                          if (addScheduleError) setAddScheduleError("");
                        }}
                      >
                        {option.label}
                      </button>
                    ))
                  ) : (
                    <div className="dropdown-no-results">Klien tidak ditemukan</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="admin-add-field student-profile-dropdown">
            <span>Tanggal dan Jam</span>
            <button
              type="button"
              className={`student-profile-dropdown-trigger ${
                activeAddScheduleMenu === "datetime" ? "is-open" : ""
              }`}
              onClick={() =>
                setActiveAddScheduleMenu((previous) =>
                  previous === "datetime" ? null : "datetime"
                )
              }
            >
              <strong>
                {formatScheduleDateLabel(addScheduleDateValue)} •{" "}
                {formatScheduleTimeDisplay(addScheduleTimeValue)}
              </strong>
              <CalendarDays size={16} />
            </button>
            {activeAddScheduleMenu === "datetime" ? (
              <div className="admin-schedule-add-datetime-popover">
                <DateTimePanel
                  dateValue={addScheduleDateValue}
                  timeValue={addScheduleTimeValue}
                  onCancel={() => setActiveAddScheduleMenu(null)}
                  onApply={(nextValue) => {
                    setAddScheduleDateValue(nextValue.dateValue);
                    setAddScheduleTimeValue(nextValue.timeValue);
                    setActiveAddScheduleMenu(null);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="student-profile-form-row">
            <div className="admin-add-field student-profile-dropdown">
              <span>Penangan</span>
              <button
                type="button"
                className={`student-profile-dropdown-trigger ${
                  activeAddScheduleMenu === "handler" ? "is-open" : ""
                }`}
                onClick={() =>
                  setActiveAddScheduleMenu((previous) =>
                    previous === "handler" ? null : "handler"
                  )
                }
              >
                <strong>{addScheduleHandlerName || "Pilih penangan"}</strong>
                <ChevronDown size={16} />
              </button>
              {activeAddScheduleMenu === "handler" ? (
                <div className="student-profile-dropdown-menu dropdown-menu-searchable">
                  <div className="dropdown-search-wrapper">
                    <input
                      type="text"
                      className="dropdown-search-input"
                      placeholder="Cari penangan..."
                      value={scheduleHandlerSearchQuery}
                      onChange={(e) => setScheduleHandlerSearchQuery(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="dropdown-options-list">
                    {filteredScheduleHandlerOptions.length > 0 ? (
                      filteredScheduleHandlerOptions.map((handlerName) => (
                        <button
                          key={handlerName}
                          type="button"
                          className={`student-profile-dropdown-option ${
                            handlerName === addScheduleHandlerName ? "is-active" : ""
                          }`}
                          onClick={() => {
                            setAddScheduleHandlerName(handlerName);
                            setActiveAddScheduleMenu(null);
                            if (addScheduleError) setAddScheduleError("");
                          }}
                        >
                          {handlerName}
                        </button>
                      ))
                    ) : (
                      <div className="dropdown-no-results">Penangan tidak ditemukan</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="admin-add-field student-profile-dropdown">
              <span>Jenis Layanan</span>
              <button
                type="button"
                className={`student-profile-dropdown-trigger ${
                  activeAddScheduleMenu === "service" ? "is-open" : ""
                }`}
                onClick={() =>
                  setActiveAddScheduleMenu((previous) =>
                    previous === "service" ? null : "service"
                  )
                }
              >
                <strong>
                  {addScheduleServiceType === "online" ? "Online" : "Tatap Muka"}
                </strong>
                <ChevronDown size={16} />
              </button>
              {activeAddScheduleMenu === "service" ? (
                <div className="student-profile-dropdown-menu">
                  {[
                    { value: "tatap_muka" as const, label: "Tatap Muka" },
                    { value: "online" as const, label: "Online" },
                  ].map((serviceOption) => (
                    <button
                      key={serviceOption.value}
                      type="button"
                      className={`student-profile-dropdown-option ${
                        serviceOption.value === addScheduleServiceType ? "is-active" : ""
                      }`}
                      onClick={() => {
                        setAddScheduleServiceType(serviceOption.value);
                        setActiveAddScheduleMenu(null);
                      }}
                    >
                      {serviceOption.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {addScheduleError ? <p className="admin-form-error">{addScheduleError}</p> : null}

          <div className="admin-add-form-actions admin-add-form-actions-inline">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Batal
            </button>
            <button type="submit" className="button button-primary">
              Simpan Jadwal
            </button>
          </div>
        </form>
    </PortalModal>
  );
}
