from fastapi import FastAPI, APIRouter, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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
# Demo seed data (mirrors the structure of the user's Google Sheets tabs).
# This backend emulates the exact HTTP contract of the user's Google Apps
# Script Web App so the app works end-to-end. Swap the URL in the app's Setup
# screen to point at the real GAS Web App at any time — the contract is identical.
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
        docs = [{"row_index": i + 2, "nama_file": name, "id_file": f"1AbCdEf_demo_{i:03d}"}
                for i, name in enumerate(REFERENSI_SEED)]
        await db.referensi.insert_many(docs)
    if await db.log.count_documents({}) == 0:
        docs = [{"row_index": i + 2, **row} for i, row in enumerate(LOG_SEED)]
        await db.log.insert_many(docs)
    if await db.inbox.count_documents({}) == 0:
        docs = [{"row_index": i + 2, **row} for i, row in enumerate(INBOX_SEED)]
        await db.inbox.insert_many(docs)


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def build_all_data() -> dict:
    log = [clean(d) for d in await db.log.find().sort("row_index", 1).to_list(1000)]
    ref = [clean(d) for d in await db.referensi.find().sort("row_index", 1).to_list(1000)]
    inbox = [clean(d) for d in await db.inbox.find().sort("row_index", 1).to_list(1000)]
    return {
        "ok": True,
        "Log_Pengiriman": log,
        "Referensi_Berkas": ref,
        "Email_Masuk": inbox,
    }


async def next_row_index(collection) -> int:
    last = await collection.find().sort("row_index", -1).limit(1).to_list(1)
    if not last:
        return 2
    return int(last[0]["row_index"]) + 1


@api_router.get("/")
async def root():
    return {"message": "JobMail Tracker API (GAS-compatible emulator)"}


# --- GAS Web App emulator: GET (read) ---------------------------------------
@api_router.get("/gas")
async def gas_get(action: Optional[str] = "getAllData"):
    await ensure_seed()
    if action == "getAllData":
        return await build_all_data()
    return {"ok": False, "error": f"Unknown action '{action}'"}


# --- GAS Web App emulator: POST (write / trigger) ---------------------------
@api_router.post("/gas")
async def gas_post(request: Request):
    await ensure_seed()
    try:
        body = await request.json()
    except Exception:
        body = {}
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
        await db.log.update_one(
            {"row_index": ri},
            {"$set": {"aksi_kirim": "TRUE", "status": "Terkirim"}},
        )
        return {"ok": True, "row_index": ri, "status": "Terkirim"}

    if action == "syncReferensi":
        # Emulates GAS ambilSemuaIdDariFolder: repopulate reference list from Drive.
        await db.referensi.delete_many({})
        docs = [{"row_index": i + 2, "nama_file": name, "id_file": f"1AbCdEf_demo_{i:03d}"}
                for i, name in enumerate(REFERENSI_SEED)]
        await db.referensi.insert_many(docs)
        return {"ok": True, "count": len(docs), "message": "Referensi tersinkron"}

    if action == "updateStatusTindakLanjut":
        ri = int(body.get("row_index"))
        text = body.get("status_text", "")
        await db.inbox.update_one(
            {"row_index": ri},
            {"$set": {"status_tindak_lanjut": text}},
        )
        return {"ok": True, "row_index": ri}

    return {"ok": False, "error": f"Unknown action '{action}'"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await ensure_seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
