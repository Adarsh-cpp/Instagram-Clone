// utils/dateTime.js

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// "Today" / "Yesterday" / "15 Sep 2026"
export const formatDateHeader = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const now = new Date();

  const startOfDay = (dt) =>
    new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();

  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// "10:42 AM"
export const formatMessageTime = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Fuller stamp used in the right-click/long-press popup,
// e.g. "10:42 AM · 15 Sep 2026"
export const formatFullTimestamp = (date) => {
  if (!date) return "";
  return `${formatMessageTime(date)} · ${formatDateHeader(date)}`;
};