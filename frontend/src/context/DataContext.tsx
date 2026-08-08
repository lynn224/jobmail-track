import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  AllData,
  LogRow,
  RefRow,
  InboxRow,
  fetchAllData,
  postAction,
  getSavedUrl,
} from "@/src/api/client";

type DataState = {
  ready: boolean; // storage checked
  connected: boolean; // has a base url
  baseUrl: string;
  log: LogRow[];
  referensi: RefRow[];
  inbox: InboxRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reloadConnection: () => Promise<void>;
  addLamaran: (p: {
    email: string;
    subjek: string;
    perusahaan: string;
    posisi: string;
    pesan: string;
    berkas: string;
    nama_pdf: string;
  }) => Promise<boolean>;
  triggerKirim: (rowIndex: number) => Promise<boolean>;
  syncReferensi: () => Promise<boolean>;
  updateFollowUp: (rowIndex: number, text: string) => Promise<boolean>;
};

const Ctx = createContext<DataState | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [log, setLog] = useState<LogRow[]>([]);
  const [referensi, setReferensi] = useState<RefRow[]>([]);
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseRef = useRef("");

  const applyData = (d: AllData) => {
    setLog(d.Log_Pengiriman || []);
    setReferensi(d.Referensi_Berkas || []);
    setInbox(d.Email_Masuk || []);
  };

  const refresh = useCallback(async () => {
    const base = baseRef.current;
    if (!base) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchAllData(base);
      applyData(d);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadConnection = useCallback(async () => {
    const url = (await getSavedUrl()) || "";
    baseRef.current = url;
    setBaseUrl(url);
    setReady(true);
    if (url) await refresh();
  }, [refresh]);

  useEffect(() => {
    reloadConnection();
  }, [reloadConnection]);

  const addLamaran = useCallback<DataState["addLamaran"]>(async (p) => {
    try {
      await postAction(baseRef.current, { action: "addLamaran", ...p });
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  const triggerKirim = useCallback(async (rowIndex: number) => {
    // Optimistic: mark as "Proses Mengirim..."
    setLog((prev) =>
      prev.map((r) =>
        r.row_index === rowIndex ? { ...r, status: "Proses Mengirim...", aksi_kirim: "TRUE" } : r
      )
    );
    try {
      await postAction(baseRef.current, { action: "triggerKirim", row_index: rowIndex });
      await refresh();
      return true;
    } catch {
      await refresh();
      return false;
    }
  }, [refresh]);

  const syncReferensi = useCallback(async () => {
    try {
      await postAction(baseRef.current, { action: "syncReferensi" });
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  const updateFollowUp = useCallback(async (rowIndex: number, text: string) => {
    setInbox((prev) =>
      prev.map((r) => (r.row_index === rowIndex ? { ...r, status_tindak_lanjut: text } : r))
    );
    try {
      await postAction(baseRef.current, {
        action: "updateStatusTindakLanjut",
        row_index: rowIndex,
        status_text: text,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const value: DataState = {
    ready,
    connected: !!baseUrl,
    baseUrl,
    log,
    referensi,
    inbox,
    loading,
    error,
    refresh,
    reloadConnection,
    addLamaran,
    triggerKirim,
    syncReferensi,
    updateFollowUp,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
