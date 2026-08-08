// HTTP client that talks to a Google Apps Script Web App (or the bundled
// GAS-compatible emulator backend). All comms are plain HTTP GET/POST — no OAuth.
import { storage } from "@/src/utils/storage";

export const GAS_URL_KEY = "jobmail_gas_url";

// Default demo endpoint = our backend GAS emulator. Users replace it in Setup.
export const DEMO_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/gas`;

export type LogRow = {
  row_index: number;
  email: string;
  subjek: string;
  perusahaan: string;
  posisi: string;
  pesan: string;
  berkas: string;
  nama_pdf: string;
  status: string;
  aksi_kirim: string;
};

export type RefRow = { row_index: number; nama_file: string; id_file: string };

export type InboxRow = {
  row_index: number;
  tanggal: string;
  nama_perusahaan: string;
  pengirim: string;
  subjek: string;
  kategori: string;
  poin_kunci: string;
  link_email: string;
  status_tindak_lanjut: string;
};

export type AllData = {
  ok: boolean;
  Log_Pengiriman: LogRow[];
  Referensi_Berkas: RefRow[];
  Email_Masuk: InboxRow[];
};

export async function getSavedUrl(): Promise<string | null> {
  return await storage.getItem(GAS_URL_KEY, "");
}

export async function saveUrl(url: string): Promise<boolean> {
  return await storage.setItem(GAS_URL_KEY, url.trim());
}

function buildGetUrl(base: string): string {
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}action=getAllData`;
}

export async function fetchAllData(base: string): Promise<AllData> {
  const res = await fetch(buildGetUrl(base), { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return {
    ok: json.ok ?? true,
    Log_Pengiriman: json.Log_Pengiriman ?? [],
    Referensi_Berkas: json.Referensi_Berkas ?? [],
    Email_Masuk: json.Email_Masuk ?? [],
  };
}

export async function postAction(base: string, payload: Record<string, any>): Promise<any> {
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
