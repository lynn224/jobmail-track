// HTTP client that talks to a Google Apps Script Web App (or the bundled
// GAS-compatible emulator backend). All comms are plain HTTP GET/POST — no OAuth.
import { storage } from "@/src/utils/storage";

export const GAS_URL_KEY = "jobmail_gas_url";

// All traffic is routed through our backend BRIDGE which forwards to the user's
// real Google Apps Script Web App and normalises its response (also avoids CORS).
export const BRIDGE_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/bridge`;

// Sentinel target that makes the bridge serve the built-in demo data.
export const DEMO_URL = "demo";

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

function buildGetUrl(target: string): string {
  return `${BRIDGE_URL}?action=getAllData&target=${encodeURIComponent(target)}`;
}

export async function fetchAllData(target: string): Promise<AllData> {
  const res = await fetch(buildGetUrl(target), { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.ok === false && (json.error || json.Log_Pengiriman == null)) {
    throw new Error(json.error || "Gagal memuat data");
  }
  return {
    ok: json.ok ?? true,
    Log_Pengiriman: json.Log_Pengiriman ?? [],
    Referensi_Berkas: json.Referensi_Berkas ?? [],
    Email_Masuk: json.Email_Masuk ?? [],
  };
}

export async function postAction(target: string, payload: Record<string, any>): Promise<any> {
  const res = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, ...payload }),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
