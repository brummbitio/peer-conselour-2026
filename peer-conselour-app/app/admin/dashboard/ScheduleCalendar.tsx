"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Video, Users, CalendarDays, User, ClipboardList } from "lucide-react";

// Assuming types are exported or we can redefine them here for simplicity
type CounselingScheduleStatus =
  | "pending_confirmation"
  | "scheduled"
  | "reschedule"
  | "cancelled"
  | "completed";

type CounselingScheduleItem = {
  id: string;
  clientName: string;
  dateValue: string;
  timeValue: string;
  handlerName: string;
  serviceType: "tatap_muka" | "online";
};

type CounselingScheduleColumn = {
  id: CounselingScheduleStatus;
  title: string;
  description: string;
  items: CounselingScheduleItem[];
};

export function ScheduleCalendar({ 
  columns,
  onOpenOverlay,
  formatDate,
  formatTime,
  onStatusChange
}: { 
  columns: CounselingScheduleColumn[];
  onOpenOverlay?: (
    event: React.MouseEvent<HTMLElement>,
    item: CounselingScheduleItem,
    kind: "datetime" | "handler" | "service"
  ) => void;
  formatDate?: (dateStr: string) => string;
  formatTime?: (timeStr: string) => string;
  onStatusChange?: (itemId: string, newStatus: CounselingScheduleStatus) => void;
}) {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const events = useMemo(() => {
    return columns.flatMap((column) =>
      column.items.map((item) => ({ ...item, status: column.id }))
    );
  }, [columns]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find(e => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_confirmation": return "Menunggu Konfirmasi";
      case "scheduled": return "Terjadwalkan";
      case "reschedule": return "Reschedule";
      case "completed": return "Selesai";
      case "cancelled": return "Batal";
      default: return status;
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedEvent]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const currentMonthName = currentDate.toLocaleString("en-US", { month: "long" });
  const currentYear = currentDate.getFullYear();

  // Month View Generation
  const generateMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);

    const prevMonthDays = daysInMonth(year, month - 1);
    const grid = [];

    // Prev month padding
    for (let i = 0; i < firstDay; i++) {
      grid.push({
        date: new Date(year, month - 1, prevMonthDays - firstDay + i + 1),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= days; i++) {
      grid.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remainingCells = 42 - grid.length;
    for (let i = 1; i <= remainingCells; i++) {
      grid.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return grid;
  };

  // Week View Generation
  const generateWeekDays = () => {
    const week = [];
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    for (let i = 0; i < 7; i++) {
      week.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return week;
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM

  return (
    <div className="admin-calendar-view">
      {/* Calendar Toolbar */}
      <div className="admin-calendar-toolbar">
        <div className="admin-calendar-toolbar-left">
          <h2>
            {currentMonthName} {currentYear}
          </h2>
        </div>

        <div className="admin-calendar-toolbar-right">
          <div className="admin-calendar-nav-group">
            <button onClick={handlePrev} className="admin-calendar-nav-btn">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleToday} className="admin-calendar-today-btn">
              Today
            </button>
            <button onClick={handleNext} className="admin-calendar-nav-btn">
              <ChevronRight size={16} />
            </button>
          </div>

          <select
            className="admin-calendar-view-select"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "month" | "week" | "day")}
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="admin-calendar-content">
        {viewMode === "month" && (
          <div className="admin-calendar-month">
            <div className="admin-calendar-month-header">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="admin-calendar-month-header-cell">
                  {day}
                </div>
              ))}
            </div>
            <div className="admin-calendar-month-grid">
              {generateMonthGrid().map((cell, idx) => {
                const year = cell.date.getFullYear();
                const month = String(cell.date.getMonth() + 1).padStart(2, '0');
                const day = String(cell.date.getDate()).padStart(2, '0');
                const cellDateStr = `${year}-${month}-${day}`;
                const dayEvents = events.filter((e) => e.dateValue === cellDateStr);
                const visibleEvents = dayEvents.slice(0, 3);
                const hiddenCount = dayEvents.length - 3;
                const isCurrentDay = isToday(cell.date);

                return (
                  <div
                    key={idx}
                    className={`admin-calendar-month-cell ${
                      !cell.isCurrentMonth ? "is-outside" : ""
                    } ${isCurrentDay ? "is-today" : ""}`}
                  >
                    <span className={`admin-calendar-date-number ${isCurrentDay ? "is-today" : ""}`}>
                      {cell.date.getDate()}
                    </span>
                    <div className="admin-calendar-events">
                      {visibleEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className={`admin-calendar-event admin-calendar-event-${evt.status}`}
                          onClick={() => setSelectedEventId(evt.id)}
                        >
                          <div className="admin-calendar-event-title">{evt.clientName}</div>
                          <div className="admin-calendar-event-time">
                            {evt.timeValue}
                          </div>
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <div className="admin-calendar-event-more">
                          {hiddenCount} jadwal lagi...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(viewMode === "week" || viewMode === "day") && (
          <div className="admin-calendar-timegrid">
            <div className="admin-calendar-timegrid-header">
              <div className="admin-calendar-timegrid-header-corner"></div>
              {viewMode === "week" ? (
                generateWeekDays().map((day, idx) => {
                  const isDayToday = isToday(day);
                  return (
                    <div key={idx} className={`admin-calendar-timegrid-header-cell ${isDayToday ? "is-today" : ""}`}>
                      <span className="admin-calendar-timegrid-day-name">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()]}
                      </span>
                      <span className="admin-calendar-timegrid-day-num">
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className={`admin-calendar-timegrid-header-cell ${isToday(currentDate) ? "is-today" : ""}`}>
                  <span className="admin-calendar-timegrid-day-name">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][currentDate.getDay()]}
                  </span>
                  <span className="admin-calendar-timegrid-day-num">
                    {currentDate.getDate()}
                  </span>
                </div>
              )}
            </div>

            <div className="admin-calendar-timegrid-body">
              <div className="admin-calendar-timegrid-times">
                {timeSlots.map((hour) => (
                  <div key={hour} className="admin-calendar-timegrid-time-label">
                    <span>{hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour)} {hour >= 12 ? "PM" : "AM"}</span>
                  </div>
                ))}
              </div>
              <div
                className="admin-calendar-timegrid-columns"
                style={{
                  gridTemplateColumns: viewMode === "week" ? "repeat(7, 1fr)" : "1fr",
                }}
              >
                {(viewMode === "week" ? generateWeekDays() : [currentDate]).map(
                  (day, dayIdx) => {
                    const year = day.getFullYear();
                    const month = String(day.getMonth() + 1).padStart(2, '0');
                    const d = String(day.getDate()).padStart(2, '0');
                    const cellDateStr = `${year}-${month}-${d}`;
                    const dayEventsRaw = events.filter((e) => e.dateValue === cellDateStr);

                    // Map to include start and end minutes, sort by start time
                    const dayEvents = dayEventsRaw.map(evt => {
                      let startStr = evt.timeValue;
                      let endStr = "";
                      if (evt.timeValue.includes("-")) {
                        const parts = evt.timeValue.split("-");
                        startStr = parts[0].trim();
                        endStr = parts[1].trim();
                      }
                      
                      const [evtHour, evtMin] = startStr.split(":").map(Number);
                      const startMins = (evtHour || 0) * 60 + (evtMin || 0);
                      
                      let endMins = startMins + 60; // default 1 hour
                      if (endStr) {
                         const [eHour, eMin] = endStr.split(":").map(Number);
                         endMins = (eHour || 0) * 60 + (eMin || 0);
                      }

                      return { ...evt, startMins, endMins };
                    }).sort((a, b) => a.startMins - b.startMins);

                    // Group overlapping events
                    const groups: typeof dayEvents[] = [];
                    let currentGroup: typeof dayEvents = [];
                    let groupEnd = 0;

                    dayEvents.forEach(evt => {
                      if (currentGroup.length === 0) {
                        currentGroup.push(evt);
                        groupEnd = evt.endMins;
                      } else {
                        if (evt.startMins < groupEnd) {
                          currentGroup.push(evt);
                          groupEnd = Math.max(groupEnd, evt.endMins);
                        } else {
                          groups.push(currentGroup);
                          currentGroup = [evt];
                          groupEnd = evt.endMins;
                        }
                      }
                    });
                    if (currentGroup.length > 0) {
                      groups.push(currentGroup);
                    }

                    return (
                      <div key={dayIdx} className="admin-calendar-timegrid-col">
                        {/* Render horizontal grid lines */}
                        {timeSlots.map((hour) => (
                          <div key={hour} className="admin-calendar-timegrid-line"></div>
                        ))}

                        {/* Render absolutely positioned events */}
                        {groups.map((group) => {
                          const widthPct = 100 / group.length;
                          return group.map((evt, idxInGroup) => {
                            if (evt.startMins < 0 || evt.startMins >= 24 * 60) return null;
                            const height = evt.endMins - evt.startMins;

                            return (
                              <div
                                key={evt.id}
                                className={`admin-calendar-timegrid-event admin-calendar-event-${evt.status}`}
                                style={{
                                  top: `${evt.startMins}px`,
                                  height: `${height}px`,
                                  left: `calc(${widthPct * idxInGroup}% + 4px)`,
                                  width: `calc(${widthPct}% - 8px)`,
                                  right: 'auto'
                                }}
                                onClick={() => setSelectedEventId(evt.id)}
                              >
                                <div className="admin-calendar-timegrid-event-title">
                                  {evt.clientName}
                                </div>
                                <div className="admin-calendar-timegrid-event-time">
                                  {evt.timeValue}
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Popup */}
      {selectedEvent && typeof document !== "undefined" ? createPortal(
        <div className="admin-calendar-popup-overlay" onClick={() => setSelectedEventId(null)}>
          <div className="admin-calendar-popup" onClick={(e) => e.stopPropagation()}>
            <div className="admin-calendar-popup-header">
              <input 
                type="text" 
                defaultValue={selectedEvent.clientName} 
                className="admin-calendar-popup-title-input"
              />
              <button className="admin-calendar-popup-close" onClick={() => setSelectedEventId(null)}>✕</button>
            </div>
            
            <div className="admin-calendar-popup-body">
              <div 
                className="admin-calendar-popup-row" 
                onClick={(e) => onOpenOverlay && onOpenOverlay(e, selectedEvent, "datetime")}
                style={onOpenOverlay ? { cursor: 'pointer' } : {}}
              >
                <span className="admin-calendar-popup-icon"><CalendarDays size={16} /></span>
                <div className="admin-calendar-popup-info">
                  <div style={{ fontSize: '1.05rem' }}>
                    {formatDate ? formatDate(selectedEvent.dateValue) : selectedEvent.dateValue} • {formatTime ? formatTime(selectedEvent.timeValue) : selectedEvent.timeValue}
                  </div>
                </div>
              </div>
              
              <div 
                className="admin-calendar-popup-row"
                onClick={(e) => onOpenOverlay && onOpenOverlay(e, selectedEvent, "handler")}
                style={onOpenOverlay ? { cursor: 'pointer' } : {}}
              >
                <span className="admin-calendar-popup-icon"><User size={16} /></span>
                <div className="admin-calendar-popup-info">
                  <div style={{ fontSize: '1.05rem' }}>{selectedEvent.handlerName}</div>
                </div>
              </div>

              <div 
                className="admin-calendar-popup-row"
                onClick={(e) => onOpenOverlay && onOpenOverlay(e, selectedEvent, "service")}
                style={onOpenOverlay ? { cursor: 'pointer' } : {}}
              >
                <span className="admin-calendar-popup-icon">
                  {selectedEvent.serviceType === "online" ? <Video size={16} /> : <Users size={16} />}
                </span>
                <div className="admin-calendar-popup-info">
                  <div style={{ fontSize: '1.05rem' }}>{selectedEvent.serviceType === "online" ? "Online" : "Tatap Muka"}</div>
                </div>
              </div>

              <div 
                className="admin-calendar-popup-row"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="admin-calendar-popup-icon"><ClipboardList size={16} /></span>
                <div className="admin-calendar-popup-info">
                  <select 
                    value={selectedEvent.status} 
                    onChange={(e) => onStatusChange && onStatusChange(selectedEvent.id, e.target.value as CounselingScheduleStatus)}
                    className="admin-calendar-popup-select"
                    style={{ fontSize: '1.05rem', padding: '2px 0', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="pending_confirmation">Menunggu Konfirmasi</option>
                    <option value="scheduled">Terjadwalkan</option>
                    <option value="reschedule">Reschedule</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Batal</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="admin-calendar-popup-footer">
              <button className="button button-primary" onClick={() => setSelectedEventId(null)}>Tutup</button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
