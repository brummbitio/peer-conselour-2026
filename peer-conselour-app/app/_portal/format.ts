type DateInput = string | number | Date | null | undefined;

// Formatter Intl dibuat sekali di level modul. toLocaleString() membuat
// formatter baru di setiap panggilan, yang terasa mahal saat merender list panjang.
const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const longDateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const numberFormatter = new Intl.NumberFormat("id-ID");

function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "11 Sep 2026" */
export function formatShortDate(value: DateInput, fallback = "-"): string {
  const date = toValidDate(value);
  return date ? shortDateFormatter.format(date) : fallback;
}

/** "11 September 2026" */
export function formatLongDate(value: DateInput, fallback = "-"): string {
  const date = toValidDate(value);
  return date ? longDateFormatter.format(date) : fallback;
}

/** "11 Sep 2026, 14.30" */
export function formatDateTime(value: DateInput, fallback = "-"): string {
  const date = toValidDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

/** "11 September 2026, 14.30" */
export function formatLongDateTime(value: DateInput, fallback = "-"): string {
  const date = toValidDate(value);
  return date ? longDateTimeFormatter.format(date) : fallback;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
