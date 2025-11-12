// --- FILE: src/lib/format.js
export function formatTimeRange(startISO, endISO, allDay = false) {
  if (!startISO) return "";
  const s = new Date(startISO);
  const e = endISO ? new Date(endISO) : null;

  if (allDay) {
    return s.toLocaleDateString();
  }
  const fmt = (d) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (!e) return `${s.toLocaleDateString()} · ${fmt(s)}`;
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  return sameDay
    ? `${s.toLocaleDateString()} · ${fmt(s)}–${fmt(e)}`
    : `${s.toLocaleDateString()} ${fmt(s)} → ${e.toLocaleDateString()} ${fmt(
        e
      )}`;
}

export function formatMoney(amount, currency = "EUR") {
  if (amount == null) return "";
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(num)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}
