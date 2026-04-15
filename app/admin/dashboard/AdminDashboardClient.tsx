"use client";

import Link from "next/link";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isAdminRole, useAuth } from "../../auth/auth-provider";
import type { AuthUser } from "../../auth/auth-provider";
import {
  getFirstResponderByTicketId,
  studentProfiles,
  ticketStatusLabel,
  tickets,
} from "../../tickets/mock-data";
import type { TicketItem, TicketStatus } from "../../tickets/mock-data";

type AdminTab = "dashboard" | "tickets" | "students" | "admins" | "profile";
type TrendRange = "day" | "month" | "year";
type TicketFilter = "all" | TicketStatus;

const trendSeries: Record<
  TrendRange,
  { title: string; labels: string[]; values: number[] }
> = {
  day: {
    title: "Per Hari",
    labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
    values: [3, 5, 4, 6, 5, 7, 4],
  },
  month: {
    title: "Per Bulan",
    labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt"],
    values: [24, 29, 31, 27, 35, 33, 30, 37],
  },
  year: {
    title: "Per Tahun",
    labels: ["2021", "2022", "2023", "2024", "2025", "2026"],
    values: [188, 214, 263, 298, 327, 341],
  },
};

export default function AdminDashboardClient() {
  const { user, adminAccounts, createAdmin } = useAuth();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [trendRange, setTrendRange] = useState<TrendRange>("day");
  const [ticketQuery, setTicketQuery] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [adminQuery, setAdminQuery] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminFormMessage, setAdminFormMessage] = useState("");
  const [adminFormError, setAdminFormError] = useState("");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("all");
  const adminName = user?.fullName ?? "";
  const isSuperadmin = user?.role === "superadmin";

  const waitingCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "open").length,
    []
  );
  const repliedCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "in_progress").length,
    []
  );
  const doneCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "resolved").length,
    []
  );
  const totalCount = tickets.length;

  const topicStats = useMemo(() => {
    const counts = tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.category] = (acc[ticket.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([topic, value]) => ({
        topic,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, []);
  const firstReplyTicketsByAdmin = useMemo(
    () =>
      tickets.reduce<Record<string, TicketItem[]>>((acc, ticket) => {
        const firstResponderName = getFirstResponderByTicketId(ticket.id);
        if (!firstResponderName) return acc;

        if (!acc[firstResponderName]) {
          acc[firstResponderName] = [];
        }
        acc[firstResponderName].push(ticket);
        return acc;
      }, {}),
    []
  );
  const firstReplyTicketsForAdmin = useMemo(
    () => firstReplyTicketsByAdmin[adminName] ?? [],
    [adminName, firstReplyTicketsByAdmin]
  );

  const activeTrend = trendSeries[trendRange];
  const chartData = useMemo(
    () =>
      activeTrend.labels.map((label, index) => ({
        label,
        value: activeTrend.values[index],
      })),
    [activeTrend]
  );
  const filteredTickets = useMemo(() => {
    const query = ticketQuery.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const statusMatch = ticketFilter === "all" || ticket.status === ticketFilter;
      const queryMatch =
        !query ||
        ticket.title.toLowerCase().includes(query) ||
        ticket.code.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query);
      return statusMatch && queryMatch;
    });
  }, [ticketQuery, ticketFilter]);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return studentProfiles;
    return studentProfiles.filter(
      (student) =>
        student.fullName.toLowerCase().includes(query) ||
        student.nim.toLowerCase().includes(query)
    );
  }, [studentQuery]);
  const studentNameById = useMemo(
    () =>
      studentProfiles.reduce<Record<string, string>>((acc, student) => {
        acc[student.id] = student.fullName;
        return acc;
      }, {}),
    []
  );
  const filteredAdminAccounts = useMemo(() => {
    const query = adminQuery.trim().toLowerCase();
    if (!query) return adminAccounts;

    return adminAccounts.filter((account) => {
      const email = account.email?.toLowerCase() ?? "";
      return (
        account.fullName.toLowerCase().includes(query) ||
        email.includes(query) ||
        account.nim.includes(query)
      );
    });
  }, [adminAccounts, adminQuery]);

  const selectTicketFilter = (nextFilter: TicketFilter) => {
    setTicketFilter(nextFilter);
  };

  const closeFilterDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
    const details = event.currentTarget.closest("details");
    if (details) {
      (details as HTMLDetailsElement).open = false;
    }
  };

  const onSelectFilter = (nextFilter: TicketFilter) => (event: React.MouseEvent<HTMLButtonElement>) => {
    selectTicketFilter(nextFilter);
    closeFilterDropdown(event);
  };

  const isFilterActive = ticketFilter !== "all";

  const filteredTicketsByQueryOnly = useMemo(() => {
    const query = ticketQuery.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(query) ||
        ticket.code.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query)
    );
  }, [ticketQuery]);

  const submitAdmin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSuperadmin) return;

    const result = createAdmin({
      email: newAdminEmail,
      password: newAdminPassword,
    });

    if (!result.ok) {
      setAdminFormError(result.message || "Admin belum berhasil ditambahkan.");
      setAdminFormMessage("");
      return;
    }

    setAdminFormError("");
    setAdminFormMessage(result.message || "Admin berhasil ditambahkan.");
    setNewAdminEmail("");
    setNewAdminPassword("");
  };

  const getRoleLabel = (role: AuthUser["role"]) => {
    if (role === "superadmin") return "Superadmin";
    if (role === "admin") return "Admin";
    return "Mahasiswa";
  };

  if (!user) {
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Dashboard Admin</h1>
          <p>Login sebagai admin untuk melihat dashboard tiket konseling.</p>
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

  return (
    <section className="section site-width account-page">
      <div className="my-counseling-layout">
        <aside className="my-counseling-tabs admin-sidebar">
          <button
            type="button"
            className={tab === "dashboard" ? "is-active" : ""}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={tab === "tickets" ? "is-active" : ""}
            onClick={() => setTab("tickets")}
          >
            Daftar Tiket
          </button>
          <button
            type="button"
            className={tab === "students" ? "is-active" : ""}
            onClick={() => setTab("students")}
          >
            Daftar Mahasiswa
          </button>
          {isSuperadmin ? (
            <button
              type="button"
              className={tab === "admins" ? "is-active" : ""}
              onClick={() => setTab("admins")}
            >
              Daftar Admin
            </button>
          ) : null}
          <button
            type="button"
            className={tab === "profile" ? "is-active" : ""}
            onClick={() => setTab("profile")}
          >
            Profil Saya
          </button>
        </aside>

        <div className="my-counseling-list admin-dashboard-main">
          {tab === "dashboard" ? (
            <>
              <div className="admin-stat-grid">
                <article className="admin-stat-card admin-stat-card-waiting">
                  <p>Menunggu Balasan</p>
                  <strong>{waitingCount}</strong>
                </article>
                <article className="admin-stat-card admin-stat-card-replied">
                  <p>Sudah Dibalas</p>
                  <strong>{repliedCount}</strong>
                </article>
                <article className="admin-stat-card admin-stat-card-done">
                  <p>Selesai</p>
                  <strong>{doneCount}</strong>
                </article>
                <article className="admin-stat-card admin-stat-card-total">
                  <p>Total</p>
                  <strong>{totalCount}</strong>
                </article>
              </div>

              <article className="admin-line-card">
                <div className="admin-line-header">
                  <h2>Total Konseling</h2>
                  <div className="admin-line-range">
                    <button
                      type="button"
                      className={trendRange === "day" ? "is-active" : ""}
                      onClick={() => setTrendRange("day")}
                    >
                      Per Hari
                    </button>
                    <button
                      type="button"
                      className={trendRange === "month" ? "is-active" : ""}
                      onClick={() => setTrendRange("month")}
                    >
                      Per Bulan
                    </button>
                    <button
                      type="button"
                      className={trendRange === "year" ? "is-active" : ""}
                      onClick={() => setTrendRange("year")}
                    >
                      Per Tahun
                    </button>
                  </div>
                </div>

                <div className="admin-line-chart-wrap">
                  <div className="admin-line-chart-canvas">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 24, right: 18, left: 2, bottom: 4 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="rgba(17, 24, 39, 0.08)"
                          strokeDasharray="0"
                        />
                        <XAxis
                          dataKey="label"
                          interval={0}
                          tickLine={false}
                          axisLine={{ stroke: "rgba(17, 24, 39, 0.24)" }}
                          tick={{ fill: "#8B95A7", fontSize: 12, fontWeight: 600 }}
                          tickMargin={16}
                          minTickGap={0}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={{ stroke: "rgba(17, 24, 39, 0.24)" }}
                          tick={{ fill: "#8B95A7", fontSize: 12, fontWeight: 600 }}
                          width={40}
                          tickMargin={8}
                          domain={[0, "dataMax + 1"]}
                        />
                        <Tooltip
                          cursor={{ stroke: "rgba(84, 171, 199, 0.28)", strokeWidth: 1 }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(17,24,39,0.1)",
                            boxShadow: "0 8px 20px rgba(17,24,39,0.08)",
                            fontSize: 12,
                          }}
                          formatter={(value) => [`${value ?? 0}`, "Total Konseling"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#2D7F9A"
                          strokeWidth={4}
                          dot={{
                            r: 6,
                            stroke: "#2D7F9A",
                            strokeWidth: 4,
                            fill: "#ffffff",
                          }}
                          activeDot={{
                            r: 7,
                            stroke: "#2D7F9A",
                            strokeWidth: 4,
                            fill: "#ffffff",
                          }}
                          isAnimationActive={false}
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            offset={10}
                            style={{
                              fill: "#2D7F9A",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </article>

              <article className="admin-topic-card">
                <h2>Grafik Topik Konseling</h2>
                <div className="admin-topic-chart-wrap">
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart
                      data={topicStats}
                      layout="vertical"
                      margin={{ top: 8, right: 22, left: 4, bottom: 4 }}
                      barCategoryGap={18}
                    >
                      <CartesianGrid
                        horizontal={false}
                        stroke="rgba(17, 24, 39, 0.08)"
                        strokeDasharray="0"
                      />
                      <XAxis
                        type="number"
                        hide
                        allowDecimals={false}
                        domain={[0, "dataMax + 1"]}
                      />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        axisLine={false}
                        tickLine={false}
                        width={120}
                        tick={{ fill: "#6B7280", fontSize: 14, fontWeight: 600 }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(84, 171, 199, 0.08)" }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(17,24,39,0.1)",
                          boxShadow: "0 8px 20px rgba(17,24,39,0.08)",
                          fontSize: 12,
                        }}
                        formatter={(value) => [`${value ?? 0}`, "Jumlah Kasus"]}
                      />
                      <Bar
                        dataKey="value"
                        fill="#54ABC7"
                        radius={[999, 999, 999, 999]}
                        barSize={18}
                        background={{
                          fill: "#E8F0F7",
                          radius: 999,
                        }}
                        isAnimationActive={false}
                      >
                        <LabelList
                          dataKey="value"
                          position="right"
                          offset={10}
                          style={{
                            fill: "#2D7F9A",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

            </>
          ) : tab === "tickets" ? (
            <>
              <div className="admin-tab-tools">
                <input
                  type="search"
                  className="admin-search-input"
                  placeholder="Cari tiket..."
                  value={ticketQuery}
                  onChange={(event) => setTicketQuery(event.target.value)}
                />
                <details className="admin-ticket-filter">
                  <summary className="admin-filter-trigger" aria-label="Filter status tiket">
                    <SlidersHorizontal size={16} />
                    {isFilterActive ? <span className="admin-filter-dot" aria-hidden="true" /> : null}
                  </summary>
                  <div className="admin-filter-dropdown">
                    <button
                      type="button"
                      className={`admin-filter-option ${
                        ticketFilter === "all" ? "admin-filter-option-active" : ""
                      }`}
                      onClick={onSelectFilter("all")}
                    >
                      Semua Status
                    </button>
                    <button
                      type="button"
                      className={`admin-filter-option ${
                        ticketFilter === "open" ? "admin-filter-option-active" : ""
                      }`}
                      onClick={onSelectFilter("open")}
                    >
                      Menunggu Balasan
                    </button>
                    <button
                      type="button"
                      className={`admin-filter-option ${
                        ticketFilter === "in_progress" ? "admin-filter-option-active" : ""
                      }`}
                      onClick={onSelectFilter("in_progress")}
                    >
                      Sudah Dibalas
                    </button>
                    <button
                      type="button"
                      className={`admin-filter-option ${
                        ticketFilter === "resolved" ? "admin-filter-option-active" : ""
                      }`}
                      onClick={onSelectFilter("resolved")}
                    >
                      Selesai
                    </button>
                  </div>
                </details>
              </div>
              <div
                className={`admin-scroll-list ${
                  filteredTickets.length > 4 ? "admin-scroll-list-active" : ""
                }`}
              >
                {filteredTickets.map((ticket) => (
                  <article key={ticket.id} className="my-counseling-card my-counseling-card-ticket">
                    <div className={`my-counseling-card-top ticket-top-${ticket.status}`}>
                      <div className="my-counseling-ticket-head">
                        <span className={`ticket-status ticket-status-${ticket.status}`}>
                          {ticketStatusLabel[ticket.status]}
                        </span>
                      </div>
                    </div>

                    <div className="my-counseling-content my-counseling-content-ticket">
                      <h2>{ticket.title}</h2>
                      <p>
                        {ticket.createdAt} • {studentNameById[ticket.studentId] ?? "Mahasiswa"}
                      </p>
                    </div>

                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="my-counseling-arrow-link"
                      aria-label={`Buka tiket ${ticket.code}`}
                    >
                      <span className="my-counseling-arrow" aria-hidden="true">
                        <ChevronRight size={20} />
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
              {filteredTickets.length === 0 ? (
                <div className="my-counseling-empty">
                  <h3>Tiket tidak ditemukan.</h3>
                  <p>
                    {filteredTicketsByQueryOnly.length > 0
                      ? "Coba ubah filter status tiket."
                      : "Coba kata kunci lain untuk mencari tiket."}
                  </p>
                </div>
              ) : null}
            </>
          ) : tab === "students" ? (
            <>
              <div className="admin-tab-tools">
                <input
                  type="search"
                  className="admin-search-input"
                  placeholder="Cari nama mahasiswa..."
                  value={studentQuery}
                  onChange={(event) => setStudentQuery(event.target.value)}
                />
              </div>
              <div
                className={`admin-scroll-list ${
                  filteredStudents.length > 4 ? "admin-scroll-list-active" : ""
                }`}
              >
                {filteredStudents.map((student) => (
                  <article key={student.id} className="admin-student-card">
                    <div className="admin-student-card-main">
                      <h2>{student.fullName}</h2>
                      <p className="admin-student-meta">
                        {student.gender} • {student.faculty}
                      </p>
                    </div>
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="my-counseling-arrow-link"
                      aria-label={`Buka detail mahasiswa ${student.fullName}`}
                    >
                      <span className="my-counseling-arrow" aria-hidden="true">
                        <ChevronRight size={20} />
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
              {filteredStudents.length === 0 ? (
                <div className="my-counseling-empty">
                  <h3>Mahasiswa tidak ditemukan.</h3>
                  <p>Coba kata kunci lain untuk mencari mahasiswa.</p>
                </div>
              ) : null}
            </>
          ) : tab === "admins" && isSuperadmin ? (
            <>
              <article className="admin-manage-card">
                <h2>Tambah Admin Baru</h2>
                <form className="admin-manage-form" onSubmit={submitAdmin}>
                  <input
                    type="email"
                    className="admin-search-input"
                    placeholder="Email admin"
                    value={newAdminEmail}
                    onChange={(event) => {
                      setNewAdminEmail(event.target.value);
                      if (adminFormError) setAdminFormError("");
                      if (adminFormMessage) setAdminFormMessage("");
                    }}
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    className="admin-search-input"
                    placeholder="Password admin (min. 8 karakter)"
                    value={newAdminPassword}
                    onChange={(event) => {
                      setNewAdminPassword(event.target.value);
                      if (adminFormError) setAdminFormError("");
                      if (adminFormMessage) setAdminFormMessage("");
                    }}
                    autoComplete="new-password"
                  />
                  <button type="submit" className="button button-primary">
                    Tambah Admin
                  </button>
                </form>
                {adminFormError ? <p className="admin-form-error">{adminFormError}</p> : null}
                {adminFormMessage ? (
                  <p className="admin-form-success">{adminFormMessage}</p>
                ) : null}
              </article>

              <div className="admin-tab-tools">
                <input
                  type="search"
                  className="admin-search-input"
                  placeholder="Cari admin..."
                  value={adminQuery}
                  onChange={(event) => setAdminQuery(event.target.value)}
                />
              </div>

              <div
                className={`admin-scroll-list ${
                  filteredAdminAccounts.length > 4 ? "admin-scroll-list-active" : ""
                }`}
              >
                {filteredAdminAccounts.map((account) => {
                  const firstReplyTickets = firstReplyTicketsByAdmin[account.fullName] ?? [];
                  return (
                    <article key={account.nim} className="admin-account-card">
                      <div className="admin-account-card-head">
                        <div className="admin-account-identity">
                          <h2>{account.fullName}</h2>
                          <p>{account.email ?? "-"}</p>
                          <span className="admin-account-role">{getRoleLabel(account.role)}</span>
                        </div>
                        <div className="admin-account-metric">
                          <span>Balasan Pertama</span>
                          <strong>{firstReplyTickets.length}</strong>
                        </div>
                      </div>

                      <div className="admin-account-ticket-list">
                        {firstReplyTickets.length > 0 ? (
                          firstReplyTickets.map((ticket) => (
                            <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
                              {ticket.title}
                            </Link>
                          ))
                        ) : (
                          <p>Belum ada tiket yang dibalas pertama.</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              {filteredAdminAccounts.length === 0 ? (
                <div className="my-counseling-empty">
                  <h3>Admin tidak ditemukan.</h3>
                  <p>Coba kata kunci lain untuk mencari admin.</p>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <article className="admin-profile-card">
                <div className="admin-profile-identity">
                  <h2>{user.fullName}</h2>
                  <p>
                    {user.role === "superadmin"
                      ? "Superadmin Layanan Konseling"
                      : "Admin Layanan Konseling"}
                  </p>
                </div>
                <div className="admin-profile-summary">
                  <span>Balasan Saya</span>
                  <strong>{firstReplyTicketsForAdmin.length}</strong>
                </div>
              </article>

              <div
                className={`admin-scroll-list ${
                  firstReplyTicketsForAdmin.length > 4 ? "admin-scroll-list-active" : ""
                }`}
              >
                {firstReplyTicketsForAdmin.map((ticket) => (
                  <article key={ticket.id} className="my-counseling-card my-counseling-card-ticket">
                    <div className={`my-counseling-card-top ticket-top-${ticket.status}`}>
                      <div className="my-counseling-ticket-head">
                        <span className={`ticket-status ticket-status-${ticket.status}`}>
                          {ticketStatusLabel[ticket.status]}
                        </span>
                      </div>
                    </div>

                    <div className="my-counseling-content my-counseling-content-ticket">
                      <h2>{ticket.title}</h2>
                      <p>
                        {ticket.createdAt} • {studentNameById[ticket.studentId] ?? "Mahasiswa"}
                      </p>
                    </div>

                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="my-counseling-arrow-link"
                      aria-label={`Buka tiket ${ticket.code}`}
                    >
                      <span className="my-counseling-arrow" aria-hidden="true">
                        <ChevronRight size={20} />
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
              {firstReplyTicketsForAdmin.length === 0 ? (
                <div className="my-counseling-empty">
                  <h3>Belum ada tiket sebagai pembalas pertama.</h3>
                  <p>Data akan tampil setelah kamu menjadi admin pembalas pertama di tiket.</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
