"""Backend tests for the GAS emulator endpoints (/api/gas).

Covers:
- GET action=getAllData
- POST action=addLamaran (create) -> verify via GET
- POST action=triggerKirim (update status) -> verify via GET
- POST action=syncReferensi (repopulate reference list)
- POST action=updateStatusTindakLanjut (inbox follow-up write) -> verify via GET
- Unknown action error paths
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://job-app-android.preview.emergentagent.com").rstrip("/")
GAS = f"{BASE_URL}/api/gas"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Read tests ------------------------------------------------------------
class TestGetAllData:
    def test_get_all_data_ok(self, api_client):
        r = api_client.get(GAS, params={"action": "getAllData"}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert isinstance(data["Log_Pengiriman"], list) and len(data["Log_Pengiriman"]) >= 5
        assert isinstance(data["Referensi_Berkas"], list) and len(data["Referensi_Berkas"]) >= 10
        assert isinstance(data["Email_Masuk"], list) and len(data["Email_Masuk"]) >= 5

    def test_all_rows_have_row_index(self, api_client):
        d = api_client.get(GAS, params={"action": "getAllData"}, timeout=20).json()
        for arr_key in ("Log_Pengiriman", "Referensi_Berkas", "Email_Masuk"):
            for row in d[arr_key]:
                assert isinstance(row.get("row_index"), int), f"missing row_index in {arr_key}: {row}"
                assert "_id" not in row, f"Mongo _id leaked in {arr_key}"

    def test_log_has_required_fields(self, api_client):
        d = api_client.get(GAS, params={"action": "getAllData"}, timeout=20).json()
        row = d["Log_Pengiriman"][0]
        for k in ("email", "perusahaan", "posisi", "berkas", "status", "aksi_kirim"):
            assert k in row

    def test_inbox_has_kategori_and_poin(self, api_client):
        d = api_client.get(GAS, params={"action": "getAllData"}, timeout=20).json()
        row = d["Email_Masuk"][0]
        for k in ("kategori", "poin_kunci", "link_email", "status_tindak_lanjut", "pengirim", "subjek"):
            assert k in row

    def test_unknown_get_action(self, api_client):
        r = api_client.get(GAS, params={"action": "bogus"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["ok"] is False


# --- addLamaran + triggerKirim (create + persist + update) -----------------
class TestAddAndTrigger:
    def test_add_lamaran_creates_row(self, api_client):
        payload = {
            "action": "addLamaran",
            "email": "TEST_hr@example.com",
            "perusahaan": "TEST Perusahaan XYZ",
            "posisi": "TEST QA Engineer",
            "berkas": "CV Umum",
            "nama_pdf": "",
        }
        r = api_client.post(GAS, json=payload, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert isinstance(d["row_index"], int) and d["row_index"] >= 2
        row_index = d["row_index"]

        # GET back and confirm persisted
        listing = api_client.get(GAS, params={"action": "getAllData"}, timeout=20).json()
        matches = [x for x in listing["Log_Pengiriman"] if x["row_index"] == row_index]
        assert matches, f"row_index {row_index} not found after insert"
        m = matches[0]
        assert m["email"] == "TEST_hr@example.com"
        assert m["perusahaan"] == "TEST Perusahaan XYZ"
        assert m["posisi"] == "TEST QA Engineer"
        assert m["status"] == ""
        assert m["aksi_kirim"] == "FALSE"

        # triggerKirim should mark it Terkirim
        r2 = api_client.post(GAS, json={"action": "triggerKirim", "row_index": row_index}, timeout=20)
        assert r2.status_code == 200
        assert r2.json()["ok"] is True
        assert r2.json()["status"] == "Terkirim"

        # verify via GET
        listing2 = api_client.get(GAS, params={"action": "getAllData"}, timeout=20).json()
        m2 = [x for x in listing2["Log_Pengiriman"] if x["row_index"] == row_index][0]
        assert m2["status"] == "Terkirim"
        assert m2["aksi_kirim"] == "TRUE"


# --- syncReferensi ---------------------------------------------------------
class TestSyncReferensi:
    def test_sync_repopulates_referensi(self, api_client):
        r = api_client.post(GAS, json={"action": "syncReferensi"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["count"] >= 10

        listing = api_client.get(GAS, params={"action": "getAllData"}, timeout=20).json()
        ref = listing["Referensi_Berkas"]
        assert len(ref) == d["count"]
        names = [x["nama_file"] for x in ref]
        assert "CV Umum" in names
        assert "KTP" in names
        # Every row has row_index and id_file
        for x in ref:
            assert isinstance(x["row_index"], int)
            assert x["id_file"].startswith("1AbCdEf_demo_")


# --- updateStatusTindakLanjut ---------------------------------------------
class TestUpdateFollowup:
    def test_update_followup_text_persists(self, api_client):
        listing = api_client.get(GAS, params={"action": "getAllData"}, timeout=20).json()
        target = listing["Email_Masuk"][0]
        ri = target["row_index"]
        text = "TEST followup: kirim CV terbaru"

        r = api_client.post(
            GAS,
            json={"action": "updateStatusTindakLanjut", "row_index": ri, "status_text": text},
            timeout=20,
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True

        listing2 = api_client.get(GAS, params={"action": "getAllData"}, timeout=20).json()
        row = [x for x in listing2["Email_Masuk"] if x["row_index"] == ri][0]
        assert row["status_tindak_lanjut"] == text


# --- Unknown POST action --------------------------------------------------
class TestUnknownAction:
    def test_unknown_post_action(self, api_client):
        r = api_client.post(GAS, json={"action": "nope"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["ok"] is False
