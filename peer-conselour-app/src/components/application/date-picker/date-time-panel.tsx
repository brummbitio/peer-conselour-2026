"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLocalTimeZone,
  parseDate,
  toCalendarDateTime,
  today,
  type CalendarDateTime,
} from "@internationalized/date";
import { useDateFormatter } from "react-aria";
import type { DateValue, Key } from "react-aria-components";
import { cx } from "@/utils/cx";
import { Calendar } from "./calendar";

import { RotateCcw } from "lucide-react";

type DateTimePanelValue = {
  dateValue: string;
  timeValue: string;
};

type DateTimePanelProps = {
  dateValue: string;
  timeValue: string;
  onApply: (value: DateTimePanelValue) => void;
  onCancel: () => void;
};

/** 15-minute intervals from 07:00 to 21:00 */
const TIME_SLOTS = Array.from({ length: 57 }, (_, index) => {
  const totalMinutes = 7 * 60 + index * 15;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const label = `${`${hour}`.padStart(2, "0")}:${`${minute}`.padStart(2, "0")}`;
  return {
    id: `${hour}:${`${minute}`.padStart(2, "0")}`,
    hour,
    minute,
    label,
    totalMinutes,
  };
});

const parseHourMinute = (value: string) => {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { hour: 8, minute: 0 };
  }
  return { hour, minute };
};

const toIsoDate = (value: DateValue) =>
  `${value.year}-${`${value.month}`.padStart(2, "0")}-${`${value.day}`.padStart(2, "0")}`;

const toTimeString = (value: DateValue) => {
  const hour = "hour" in value ? value.hour : 8;
  const minute = "minute" in value ? value.minute : 0;
  return `${`${hour}`.padStart(2, "0")}:${`${minute}`.padStart(2, "0")}`;
};

const parseTimeRange = (timeValue: string) => {
  if (timeValue.includes("-")) {
    const [start, end] = timeValue.split("-").map(s => s.trim());
    return { start, end };
  }
  return { start: timeValue, end: "" };
};

const toDateTimeValue = (dateValue: string, timeValue: string): CalendarDateTime => {
  const parsedDate = parseDate(dateValue);
  const { start } = parseTimeRange(timeValue);
  const { hour, minute } = parseHourMinute(start);
  return toCalendarDateTime(parsedDate).set({ hour, minute });
};

const normalizeDateTime = (value: DateValue | null): CalendarDateTime => {
  if (!value) {
    return toCalendarDateTime(today(getLocalTimeZone())).set({ hour: 8, minute: 0 });
  }
  return "hour" in value ? (value as CalendarDateTime) : toCalendarDateTime(value);
};

const toSlotId = (hour: number, minute: number) =>
  `${hour}:${`${minute}`.padStart(2, "0")}`;

export const DateTimePanel = ({
  dateValue,
  timeValue,
  onApply,
  onCancel,
}: DateTimePanelProps) => {
  const [value, setValue] = useState<DateValue | null>(() =>
    toDateTimeValue(dateValue, timeValue)
  );
  const [focusedValue, setFocusedValue] = useState<DateValue | null>(() =>
    toDateTimeValue(dateValue, timeValue)
  );

  // Two-step state: "start" = picking start time, "end" = picking end time
  const [step, setStep] = useState<"start" | "end">(() => {
    const { end } = parseTimeRange(timeValue);
    return end ? "end" : "start";
  });

  const [startTimeId, setStartTimeId] = useState<string>(() => {
    const { start } = parseTimeRange(timeValue);
    const { hour, minute } = parseHourMinute(start);
    return toSlotId(hour, minute);
  });

  const [endTimeId, setEndTimeId] = useState<string>(() => {
    const { end } = parseTimeRange(timeValue);
    if (!end) return "";
    const { hour, minute } = parseHourMinute(end);
    return toSlotId(hour, minute);
  });

  const dateFormatter = useDateFormatter({
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    const next = toDateTimeValue(dateValue, timeValue);
    const { start, end } = parseTimeRange(timeValue);
    setValue(next);
    setFocusedValue(next);

    const startParsed = parseHourMinute(start);
    setStartTimeId(toSlotId(startParsed.hour, startParsed.minute));

    if (end) {
      const endParsed = parseHourMinute(end);
      setEndTimeId(toSlotId(endParsed.hour, endParsed.minute));
      setStep("end");
    } else {
      setEndTimeId("");
      setStep("start");
    }
  }, [dateValue, timeValue]);

  const startSlot = useMemo(() => TIME_SLOTS.find(s => s.id === startTimeId), [startTimeId]);

  const handleTodayClick = () => {
    const currentValue = normalizeDateTime(value);
    const nextValue = toCalendarDateTime(today(getLocalTimeZone())).set({
      hour: currentValue.hour,
      minute: currentValue.minute,
    });
    setValue(nextValue);
    setFocusedValue(nextValue);
  };

  const handleDateChange = (nextValue: DateValue) => {
    const current = normalizeDateTime(value);
    const normalizedNext = normalizeDateTime(nextValue).set({
      hour: current.hour,
      minute: current.minute,
    });
    setValue(normalizedNext);
  };

  const handleTimeClick = (slotId: string) => {
    const slot = TIME_SLOTS.find((item) => item.id === slotId);
    if (!slot) return;

    if (step === "start") {
      // Set start time, move to end step
      setStartTimeId(slot.id);
      setEndTimeId("");
      const current = normalizeDateTime(value);
      setValue(current.set({ hour: slot.hour, minute: slot.minute }));
      setStep("end");
    } else {
      // Set end time
      setEndTimeId(slot.id);
    }
  };

  const handleReset = () => {
    setStep("start");
    setEndTimeId("");
  };

  const applySelection = () => {
    const nextValue = normalizeDateTime(value);
    const startStr = toTimeString(nextValue);
    const endParts = endTimeId ? endTimeId.split(":").map(v => v.padStart(2, "0")).join(":") : "";
    const timeStr = endParts ? `${startStr} - ${endParts}` : startStr;

    onApply({
      dateValue: toIsoDate(nextValue),
      timeValue: timeStr,
    });
  };

  return (
    <div className="dtp-root">
      <div className="dtp-body">
        <div className="dtp-calendar-wrap">
          <Calendar
            value={value}
            focusedValue={focusedValue ?? undefined}
            onFocusChange={setFocusedValue}
            onChange={handleDateChange}
          >
            <></>
          </Calendar>
        </div>

        <div className="dtp-time-wrap">
          <div className="dtp-time-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{step === "start" ? "Pilih Waktu Mulai" : "Pilih Waktu Selesai"}</span>
            {step === "end" && (
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: "none",
                  border: "none",
                  color: "#54abc7",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                  borderRadius: "4px",
                  transition: "background 0.2s"
                }}
                className="dtp-reset-btn"
                title="Reset waktu"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
          <div className="dtp-time-scroll-area">
            <ul className="dtp-time-list">
              {TIME_SLOTS.map((slot) => {
                const isStart = startTimeId === slot.id;
                const isEnd = endTimeId === slot.id;
                const isSelected = isStart || isEnd;

                // In "end" step, disable slots at or before start time
                const isDisabled =
                  step === "end" &&
                  startSlot != null &&
                  slot.totalMinutes <= startSlot.totalMinutes;

                // Highlight range between start and end
                const endSlot = TIME_SLOTS.find(s => s.id === endTimeId);
                const isInRange =
                  step === "end" &&
                  startSlot != null &&
                  endSlot != null &&
                  slot.totalMinutes > startSlot.totalMinutes &&
                  slot.totalMinutes < endSlot.totalMinutes;

                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      className={cx(
                        "dtp-time-btn",
                        isSelected && "is-selected",
                        isInRange && "is-in-range",
                        isDisabled && "is-disabled"
                      )}
                      disabled={isDisabled}
                      onClick={() => handleTimeClick(slot.id)}
                    >
                      {slot.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <footer className="dtp-footer">
        <div className="dtp-footer-left">
          <div className="dtp-date-display">
            {value
              ? dateFormatter.format(normalizeDateTime(value).toDate(getLocalTimeZone()))
              : "-"}
          </div>
          <button type="button" className="dtp-btn dtp-btn-secondary" onClick={handleTodayClick}>
            Hari Ini
          </button>
        </div>
        <div className="dtp-footer-right">
          <button type="button" className="dtp-btn dtp-btn-secondary" onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="dtp-btn dtp-btn-primary" onClick={applySelection}>
            Terapkan
          </button>
        </div>
      </footer>
    </div>
  );
};
