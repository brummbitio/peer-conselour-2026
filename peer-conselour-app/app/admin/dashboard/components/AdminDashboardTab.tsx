"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
  Bar,
  BarChart,
} from "recharts";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { AnimatedCounter } from "./AnimatedCounter";
import { trendSeries } from "../types";
import type { TrendRange } from "../types";

interface AdminDashboardTabProps {
  adminStats: any;
}

export function AdminDashboardTab({ adminStats }: AdminDashboardTabProps) {
  const [trendRange, setTrendRange] = useState<TrendRange>("day");
  // Recharts menerima ukuran sebagai angka (lebar sumbu, font tick), jadi
  // penyesuaian untuk layar < 768px tidak cukup lewat CSS saja.
  const isMobile = !useBreakpoint("md");

  // Nilai 4 kartu statistik dihitung di backend (GetDashboardStats)
  const waitingCount = Number(adminStats?.waiting ?? 0);
  const repliedCount = Number(adminStats?.in_progress ?? 0);
  const handledCount = Number(adminStats?.handled ?? 0);
  const unhandledCount = Number(adminStats?.unhandled ?? 0);

  // Hitung data tren konseling
  const chartData = useMemo(
    () =>
      trendSeries[trendRange].labels.map((label, idx) => ({
        label,
        value: trendSeries[trendRange].values[idx] || 0,
      })),
    [trendRange]
  );

  // Hitung data statistik topik (mendukung format category_counts dari backend Go maupun topic_stats)
  const topicStats = useMemo(() => {
    const rawList = adminStats?.category_counts || adminStats?.topic_stats;
    if (!rawList || !Array.isArray(rawList)) {
      return [];
    }
    return rawList
      .map((item: any) => ({
        topic: item.category || item.topic || "Lain-lain",
        value: Number(item.count || 0),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [adminStats]);

  return (
    <>
      <div className="admin-stat-grid">
        <article className="admin-stat-card admin-stat-card-waiting">
          <p>Menunggu Balasan</p>
          <strong>
            <AnimatedCounter value={waitingCount} />
          </strong>
        </article>
        <article className="admin-stat-card admin-stat-card-replied">
          <p>Sudah Dibalas</p>
          <strong>
            <AnimatedCounter value={repliedCount} />
          </strong>
        </article>
        <article className="admin-stat-card admin-stat-card-done">
          <p>Tertangani</p>
          <strong>
            <AnimatedCounter value={handledCount} />
          </strong>
        </article>
        <article className="admin-stat-card admin-stat-card-unhandled">
          <p>Tidak Tertangani</p>
          <strong>
            <AnimatedCounter value={unhandledCount} />
          </strong>
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
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <LineChart
                data={chartData}
                margin={
                  isMobile
                    ? { top: 24, right: 12, left: 0, bottom: 4 }
                    : { top: 24, right: 18, left: 2, bottom: 4 }
                }
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
                  tick={{ fill: "#8B95A7", fontSize: isMobile ? 11 : 12, fontWeight: 600 }}
                  tickMargin={isMobile ? 10 : 16}
                  minTickGap={0}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(17, 24, 39, 0.24)" }}
                  tick={{ fill: "#8B95A7", fontSize: isMobile ? 11 : 12, fontWeight: 600 }}
                  width={isMobile ? 34 : 40}
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
                  isAnimationActive={true}
                  animationDuration={1500}
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
        {topicStats.length === 0 ? (
          <div
            style={{
              padding: "28px 0",
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
            }}
          >
            Belum ada data topik konseling
          </div>
        ) : (
          <div
            className="admin-topic-chart-wrap"
            style={{
              maxHeight: "160px",
              overflowY: "auto",
              paddingRight: "6px",
              display: "block",
            }}
          >
            <ResponsiveContainer width="100%" height={Math.max(160, topicStats.length * 48)}>
            <BarChart
              data={topicStats}
              layout="vertical"
              margin={{ top: 8, right: isMobile ? 28 : 35, left: 4, bottom: 4 }}
              barCategoryGap={10}
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
                domain={[0, (dataMax) => Math.ceil(dataMax * 1.15 + 10)]}
              />
              <YAxis
                type="category"
                dataKey="topic"
                axisLine={false}
                tickLine={false}
                width={isMobile ? 110 : 150}
                tick={{ fill: "#6B7280", fontSize: isMobile ? 12 : 14, fontWeight: 600 }}
                tickFormatter={(tick) => tick.replace(/^Konseling\s+/i, "")}
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
                isAnimationActive={true}
                animationDuration={1500}
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
        )}
      </article>
    </>
  );
}
