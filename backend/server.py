from fastapi import FastAPI, APIRouter, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
import requests
from pathlib import Path
from typing import Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# JobMail Tracker backend.
#
# Two responsibilities:
#   1. A GAS-compatible DEMO emulator (MongoDB seeded) for trying the app.
#   2. A BRIDGE/PROXY that forwards requests to the user's real Google Apps
#      Script Web App and NORMALISES its response into the shape the app
#      expects. This also sidesteps browser CORS (server-to-server fetch) so
#      the app works both in the web preview and on native Android.
#
# Real GAS getAllData shape (what we normalise FROM):
#   { "log_pengiriman": [[header...], [rowcells...], ...],
#     "referensi_berkas": [[header],[..]],
#     "email_masuk": [[header],[..]] }
# Rows are arrays of cell values including a header row at index 0 and possibly
# many trailing empty rows. row_index = arrayIndex + 1 (sheet row number).
# ---------------------------------------------------------------------------

REFERENSI_SEED = [
    "CV Admin Gudang", "CV Umum", "Ijazah 1", "Ijazah 2", "SKHUN 1",
    "Transkrip Nilai", "Sertifikat K3", "KTP", "Kartu Keluarga",
    "Surat Pengalaman Kerja",
]

LOG_SEED = [
    {"email": "hrd@bitniaga.co.id", "subjek": "", "perusahaan": "PT Bitniaga Cipta Cemerlang",
     "posisi": "Admin Gudang", "pesan": "", "berkas": "CV Admin Gudang, Ijazah 1, SKHUN 1",
     "nama_pdf": "", "status": "Terkirim", "aksi_kirim": "TRUE"},
    {"email": "recruitment@majujaya.com", "subjek": "", "perusahaan": "PT Maju Jaya Sentosa",
     "posisi": "Staff Administrasi", "pesan": "", "berkas": "CV Umum, Ijazah 1",
     "nama_pdf": "", "status": "Proses", "aksi_kirim": "TRUE"},
    {"email": "career@sinardigital.id", "subjek": "", "perusahaan": "CV Sinar Digital",
     "posisi": "Data Entry", "pesan": "", "berkas": "CV Umum, Transkrip Nilai",
     "nama_pdf": "", "status": "Gagal", "aksi_kirim": "TRUE"},
    {"email": "hr@kreatifmedia.co.id", "subjek": "", "perusahaan": "PT Kreatif Media Nusantara",
     "posisi": "Content Writer", "pesan": "", "berkas": "CV Umum",
     "nama_pdf": "", "status": "", "aksi_kirim": "FALSE"},
    {"email": "lowongan@logistikprima.com", "subjek": "", "perusahaan": "PT Logistik Prima",
     "posisi": "Operator Forklift", "pesan": "", "berkas": "CV Admin Gudang, Sertifikat K3",
     "nama_pdf": "", "status": "", "aksi_kirim": "FALSE"},
]

INBOX_SEED = [
    {"tanggal": "12 Jun 2026", "nama_perusahaan": "PT Bitniaga Cipta Cemerlang",
     "pengirim": "hrd@bitniaga.co.id", "subjek": "Undangan Wawancara Tahap 1 - Admin Gudang",
     "kategori": "Undangan Wawancara",
     "poin_kunci": "Wawancara dijadwalkan Selasa, 17 Juni 2026 pukul 10.00 WIB di kantor pusat. Harap membawa CV asli dan berpakaian rapi.",
     "link_email": "https://mail.google.com/mail/u/0/#inbox", "status_tindak_lanjut": ""},
    {"tanggal": "10 Jun 2026", "nama_perusahaan": "PT Sukses Bersama",
     "pengirim": "recruitment@suksesbersama.co.id", "subjek": "Penawaran Kerja - Staff Operasional",
     "kategori": "Penawaran Kerja",
     "poin_kunci": "Selamat! Anda diterima sebagai Staff Operasional. Gaji pokok Rp 4.500.000 + tunjangan. Mohon konfirmasi paling lambat 3 hari.",
     "link_email": "https://mail.google.com/mail/u/0/#inbox", "status_tindak_lanjut": ""},
    {"tanggal": "8 Jun 2026", "nama_perusahaan": "CV Sinar Digital",
     "pengirim": "career@sinardigital.id", "subjek": "Undangan Tes Online - Data Entry",
     "kategori": "Tes / Seleksi",
     "poin_kunci": "Silakan kerjakan tes online melalui link yang dikirim. Batas waktu pengerjaan 2x24 jam sejak email diterima.",
     "link_email": "https://mail.google.com/mail/u/0/#inbox", "status_tindak_lanjut": ""},
    {"tanggal": "5 Jun 2026", "nama_perusahaan": "PT Global Retail",
     "pengirim": "hr@globalretail.com", "subjek": "Hasil Seleksi Administrasi",
     "kategori": "Ditolak",
     "poin_kunci": "Terima kasih atas partisipasi Anda. Mohon maaf, kualifikasi Anda belum sesuai dengan kebutuhan kami saat ini.",
     "link_email": "https://mail.google.com/mail/u/0/#inbox", "status_tindak_lanjut": "Simpan untuk lowongan berikutnya"},
    {"tanggal": "2 Jun 2026", "nama_perusahaan": "PT Maju Jaya Sentosa",
     "pengirim": "recruitment@majujaya.com", "subjek": "Konfirmasi Penerimaan Berkas Lamaran",
     "kategori": "Lainnya",
     "poin_kunci": "Berkas lamaran Anda telah kami terima dan sedang dalam proses review oleh tim rekrutmen.",
     "link_email": "https://mail.google.com/mail/u/0/#inbox", "status_tindak_lanjut": ""},
]


async def ensure_seed():
    if await db.referensi.count_documents({}) == 0:
        await db.referensi.insert_many(
            [{"row_index": i + 2, "nama_file": n, "id_file": f"1AbCdEf_demo_{i:03d}"}
             for i, n in enumerate(REFERENSI_SEED)]
        )
    if await db.log.count_documents({}) == 0:
        await db.log.insert_many([{"row_index": i + 2, **r} for i, r in enumerate(LOG_SEED)])
    if await db.inbox.count_documents({}) == 0:
        await db.inbox.insert_many([{"row_index": i + 2, **r} for i, r in enumerate(INBOX_SEED)])


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def build_all_data() -> dict:
    log = [clean(d) for d in await db.log.find().sort("row_index", 1).to_list(2000)]
    ref = [clean(d) for d in await db.referensi.find().sort("row_index", 1).to_list(2000)]
    inbox = [clean(d) for d in await db.inbox.find().sort("row_index", 1).to_list(2000)]
    return {"ok": True, "Log_Pengiriman": log, "Referensi_Berkas": ref, "Email_Masuk": inbox}


async def next_row_index(collection) -> int:
    last = await collection.find().sort("row_index", -1).limit(1).to_list(1)
    return int(last[0]["row_index"]) + 1 if last else 2


# ---------------------------------------------------------------------------
# Normalisation of a real GAS getAllData payload -> app shape.
# ---------------------------------------------------------------------------

LOG_COLS = ["email", "subjek", "perusahaan", "posisi", "pesan", "berkas", "nama_pdf", "status", "aksi_kirim"]
REF_COLS = ["nama_file", "id_file"]
INBOX_COLS = ["tanggal", "nama_perusahaan", "pengirim", "subjek", "kategori", "poin_kunci", "link_email", "status_tindak_lanjut"]


def _cell(x):
    if isinstance(x, bool):
        return "TRUE" if x else "FALSE"
    if x is None:
        return ""
    return x if isinstance(x, str) else str(x)


def _rows_to_objects(rows, cols, required_idx):
    out = []
    if not isinstance(rows, list):
        return out
    for i, r in enumerate(rows):
        # Already an object (our demo emulator) — pass through untouched.
        if isinstance(r, dict):
            out.append(r)
            continue
        if not isinstance(r, list):
            continue
        # index 0 is the sheet header row -> skip.
        if i == 0:
            continue
        vals = [_cell(x) for x in r]
        obj = {"row_index": i + 1}
        for idx, name in enumerate(cols):
            obj[name] = vals[idx].strip() if (idx < len(vals) and isinstance(vals[idx], str)) else (vals[idx] if idx < len(vals) else "")
        # Skip empty/trailing rows: all required cells blank.
        if all(not str(obj.get(cols[j], "")).strip() for j in required_idx):
            continue
        out.append(obj)
    return out


def _get_tab(raw: dict, *keys):
    for k in keys:
        if k in raw:
            return raw[k]
    return []


def normalize_getall(raw) -> dict:
    if not isinstance(raw, dict):
        return {"ok": False, "error": "Format respons GAS tidak dikenali", "Log_Pengiriman": [], "Referensi_Berkas": [], "Email_Masuk": []}
    log = _get_tab(raw, "Log_Pengiriman", "log_pengiriman")
    ref = _get_tab(raw, "Referensi_Berkas", "referensi_berkas")
    inbox = _get_tab(raw, "Email_Masuk", "email_masuk")
    return {
        "ok": True,
        "Log_Pengiriman": _rows_to_objects(log, LOG_COLS, [0, 2, 3]),
        "Referensi_Berkas": _rows_to_objects(ref, REF_COLS, [0]),
        "Email_Masuk": _rows_to_objects(inbox, INBOX_COLS, [1, 3]),
    }


# ---------------------------------------------------------------------------
# Demo emulator write actions (used when target is empty / "demo").
# ---------------------------------------------------------------------------

async def emulator_action(body: dict) -> dict:
    await ensure_seed()
    action = body.get("action")

    if action == "addLamaran":
        ri = await next_row_index(db.log)
        row = {
            "row_index": ri,
            "email": body.get("email", ""),
            "subjek": body.get("subjek", ""),
            "perusahaan": body.get("perusahaan", ""),
            "posisi": body.get("posisi", ""),
            "pesan": body.get("pesan", ""),
            "berkas": body.get("berkas", ""),
            "nama_pdf": body.get("nama_pdf", ""),
            "status": "",
            "aksi_kirim": "FALSE",
        }
        await db.log.insert_one(dict(row))
        return {"ok": True, "row_index": ri, "message": "Lamaran ditambahkan"}

    if action == "triggerKirim":
        ri = int(body.get("row_index"))
        await db.log.update_one({"row_index": ri}, {"$set": {"aksi_kirim": "TRUE", "status": "Terkirim"}})
        return {"ok": True, "row_index": ri, "status": "Terkirim"}

    if action == "syncReferensi":
        await db.referensi.delete_many({})
        await db.referensi.insert_many(
            [{"row_index": i + 2, "nama_file": n, "id_file": f"1AbCdEf_demo_{i:03d}"}
             for i, n in enumerate(REFERENSI_SEED)]
        )
        return {"ok": True, "count": len(REFERENSI_SEED), "message": "Referensi tersinkron"}

    if action == "updateStatusTindakLanjut":
        ri = int(body.get("row_index"))
        await db.inbox.update_one({"row_index": ri}, {"$set": {"status_tindak_lanjut": body.get("status_text", "")}})
        return {"ok": True, "row_index": ri}

    return {"ok": False, "error": f"Unknown action '{action}'"}


def _is_demo(target: Optional[str]) -> bool:
    return (not target) or target == "demo" or target.rstrip("/").endswith("/api/gas")


@api_router.get("/")
async def root():
    return {"message": "JobMail Tracker API (bridge + GAS emulator)"}


# --- BRIDGE: read (GET) -----------------------------------------------------
@api_router.get("/bridge")
async def bridge_get(action: str = "getAllData", target: str = ""):
    if _is_demo(target):
        await ensure_seed()
        return await build_all_data()
    try:
        def _fetch():
            sep = "&" if "?" in target else "?"
            return requests.get(f"{target}{sep}action={action}", timeout=30, allow_redirects=True)
        resp = await asyncio.to_thread(_fetch)
        raw = resp.json()
        return normalize_getall(raw)
    except Exception as e:
        logger.exception("bridge_get failed")
        return {"ok": False, "error": f"Gagal menghubungi GAS: {e}", "Log_Pengiriman": [], "Referensi_Berkas": [], "Email_Masuk": []}


# --- BRIDGE: write / trigger (POST) -----------------------------------------
@api_router.post("/bridge")
async def bridge_post(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    target = body.get("target", "")
    payload = {k: v for k, v in body.items() if k != "target"}

    if _is_demo(target):
        return await emulator_action(payload)

    try:
        def _post():
            return requests.post(target, json=payload, timeout=30, allow_redirects=True)
        resp = await asyncio.to_thread(_post)
        try:
            return resp.json()
        except Exception:
            return {"ok": True, "raw": resp.text[:500]}
    except Exception as e:
        logger.exception("bridge_post failed")
        return {"ok": False, "error": f"Gagal menghubungi GAS: {e}"}


# --- Legacy GAS emulator endpoints (kept for direct demo access) ------------
@api_router.get("/gas")
async def gas_get(action: Optional[str] = "getAllData"):
    await ensure_seed()
    if action == "getAllData":
        return await build_all_data()
    return {"ok": False, "error": f"Unknown action '{action}'"}


@api_router.post("/gas")
async def gas_post(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    return await emulator_action(body)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await ensure_seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
