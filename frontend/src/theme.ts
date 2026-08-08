// Central design tokens for JobMail Tracker — brutalist monochrome (zinc).
import dayjs from "dayjs";

export const colors = {
  surface: "#FFFFFF",
  surfaceSecondary: "#FAFAFA",
  surfaceTertiary: "#F4F4F5",
  onSurface: "#18181B",
  onSurfaceMuted: "#71717A",
  brand: "#18181B",
  onBrand: "#FFFFFF",
  border: "#E4E4E7",
  borderStrong: "#18181B",
  divider: "#F4F4F5",

  // Status badge (Log Pengiriman)
  badge: {
    terkirim: { bg: "#DCFCE7", fg: "#15803D" },
    proses: { bg: "#FEF9C3", fg: "#A16207" },
    gagal: { bg: "#FEE2E2", fg: "#B91C1C" },
    empty: { bg: "#F4F4F5", fg: "#71717A" },
  },

  // Inbox category dots
  dot: {
    undangan: "#2563EB",
    penawaran: "#22C55E",
    tes: "#9333EA",
    ditolak: "#EF4444",
    lainnya: "#9CA3AF",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 0,
  md: 6,
  lg: 12,
  pill: 999,
};

export const font = {
  sm: 11,
  base: 12,
  lg: 14,
  xl: 18,
  "2xl": 20,
};

// Maps a raw status string to a badge style + label.
export function statusStyle(status?: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("terkirim")) return { ...colors.badge.terkirim, label: status || "Terkirim" };
  if (s.includes("proses")) return { ...colors.badge.proses, label: status || "Proses" };
  if (s.includes("gagal")) return { ...colors.badge.gagal, label: status || "Gagal" };
  return { ...colors.badge.empty, label: "Belum Dikirim" };
}

// Maps inbox category to a dot color.
export function categoryColor(kategori?: string) {
  const k = (kategori || "").toLowerCase();
  if (k.includes("undangan")) return colors.dot.undangan;
  if (k.includes("penawaran")) return colors.dot.penawaran;
  if (k.includes("tes") || k.includes("seleksi")) return colors.dot.tes;
  if (k.includes("tolak")) return colors.dot.ditolak;
  return colors.dot.lainnya;
}

// Formats an ISO datetime (from real GAS) to "DD MMM YYYY"; leaves other strings as-is.
export function formatTanggal(s?: string) {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = dayjs(s);
    if (d.isValid()) return d.format("DD MMM YYYY");
  }
  return s;
}
