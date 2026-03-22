export const formatINR = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);

export const formatNumber = (num: number): string =>
  new Intl.NumberFormat("en-IN").format(num);

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

export const formatDateISO = (date: Date): string =>
  date.toISOString().split("T")[0];

export const formatPercent = (value: number): string =>
  `${value.toFixed(2)}%`;

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};
