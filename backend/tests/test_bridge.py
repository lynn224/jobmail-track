"""Tests for /api/bridge (real GAS proxy + demo emulator)."""

import os
import time
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else "https://job-app-android.preview.emergentagent.com"
BRIDGE = f"{BASE_URL}/api/bridge"

REAL_GAS_URL = "https://script.google.com/macros/s/AKfycbyZYTcHJfB9EtOvW9qxPKDwSpzCqvdif9V7hpP-HVKRFGwtx6obPCNkBw8gE8N_-yiaRQ/exec"

LOG_KEYS = {"row_index", "email", "perusahaan", "posisi", "status"}
REF_KEYS = {"row_index", "nama_file", "id_file"}
INBOX_KEYS = {"row_index", "nama_perusahaan", "kategori", "subjek"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- REAL GAS READ ONLY --------------------------------------------------
class TestBridgeReadRealGAS:
    def test_get_all_data_real_gas_ok_and_non_empty(self, session):
        r = session.get(BRIDGE, params={"action": "getAllData", "target": REAL_GAS_URL}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True, f"Expected ok=True, got: {d}"
        assert isinstance(d.get("Log_Pengiriman"), list)
        assert isinstance(d.get("Referensi_Berkas"), list)
        assert isinstance(d.get("Email_Masuk"), list)

        # Non-empty (real sheet contains data)
        assert len(d["Log_Pengiriman"]) > 0, "Log_Pengiriman should be non-empty"
        assert len(d["Referensi_Berkas"]) > 0, "Referensi_Berkas should be non-empty"
        # Email inbox may be very small - just ensure list type; but expect >=1 per spec
        assert len(d["Email_Masuk"]) >= 1, "Email_Masuk should have at least 1 row"

        # NOT 1000 (empty trailing rows must be filtered)
        assert len(d["Log_Pengiriman"]) < 100, f"Log rows should be filtered, got {len(d['Log_Pengiriman'])}"
        assert len(d["Referensi_Berkas"]) < 100, f"Ref rows should be filtered, got {len(d['Referensi_Berkas'])}"
        assert len(d["Email_Masuk"]) < 100

        # Header row must be excluded: first row_index should be >= 2
        first_log = d["Log_Pengiriman"][0]
        assert first_log["row_index"] >= 2, f"row_index={first_log['row_index']} suggests header not skipped"

        # Object shape
        assert LOG_KEYS.issubset(first_log.keys()), f"Missing log keys: {LOG_KEYS - set(first_log.keys())}"
        assert REF_KEYS.issubset(d["Referensi_Berkas"][0].keys())
        assert INBOX_KEYS.issubset(d["Email_Masuk"][0].keys())

    def test_real_gas_expected_company_present(self, session):
        r = session.get(BRIDGE, params={"action": "getAllData", "target": REAL_GAS_URL}, timeout=60)
        d = r.json()
        companies = [x.get("perusahaan", "") for x in d.get("Log_Pengiriman", [])]
        joined = " | ".join(companies)
        # Spec mentions 'PT Maju' and 'PT Surya Multi Cemerlang' etc.
        assert any("PT Maju" in c or "Surya" in c for c in companies), (
            f"Expected PT Maju / Surya in companies, got: {joined}"
        )


# ---------- DEMO READ -----------------------------------------------------------
class TestBridgeReadDemo:
    def test_demo_get_all_data(self, session):
        r = session.get(BRIDGE, params={"action": "getAllData", "target": "demo"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert len(d["Log_Pengiriman"]) >= 5
        assert len(d["Referensi_Berkas"]) >= 10
        assert len(d["Email_Masuk"]) >= 5
        # No mongo _id leaks
        for row in d["Log_Pengiriman"]:
            assert "_id" not in row

    def test_demo_empty_target_also_demo(self, session):
        # Empty target should route to demo emulator
        r = session.get(BRIDGE, params={"action": "getAllData", "target": ""}, timeout=30)
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ---------- DEMO WRITES ---------------------------------------------------------
class TestBridgeWriteDemo:
    def test_add_lamaran_then_verify(self, session):
        payload = {
            "target": "demo",
            "action": "addLamaran",
            "email": "TEST_bridge@example.com",
            "subjek": "",
            "perusahaan": "TEST_PT Bridge",
            "posisi": "TEST_Bridge Tester",
            "pesan": "",
            "berkas": "CV Umum",
            "nama_pdf": "",
        }
        r = session.post(BRIDGE, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        ri = body.get("row_index")
        assert isinstance(ri, int) and ri >= 2

        # verify via GET
        g = session.get(BRIDGE, params={"action": "getAllData", "target": "demo"}).json()
        row = next((x for x in g["Log_Pengiriman"] if x["row_index"] == ri), None)
        assert row is not None, f"Row {ri} not found after insert"
        assert row["email"] == "TEST_bridge@example.com"
        assert row["perusahaan"] == "TEST_PT Bridge"
        assert row["status"] == ""
        assert row["aksi_kirim"] == "FALSE"

        # trigger kirim
        t = session.post(BRIDGE, json={"target": "demo", "action": "triggerKirim", "row_index": ri}).json()
        assert t.get("ok") is True
        assert t.get("status") == "Terkirim"

        # verify status is Terkirim
        g2 = session.get(BRIDGE, params={"action": "getAllData", "target": "demo"}).json()
        row2 = next(x for x in g2["Log_Pengiriman"] if x["row_index"] == ri)
        assert row2["status"] == "Terkirim"
        assert row2["aksi_kirim"] == "TRUE"

    def test_sync_referensi(self, session):
        r = session.post(BRIDGE, json={"target": "demo", "action": "syncReferensi"}).json()
        assert r.get("ok") is True
        assert isinstance(r.get("count"), int) and r["count"] > 0

        g = session.get(BRIDGE, params={"action": "getAllData", "target": "demo"}).json()
        assert len(g["Referensi_Berkas"]) == r["count"]

    def test_update_status_tindak_lanjut(self, session):
        # pick first inbox row from demo
        g = session.get(BRIDGE, params={"action": "getAllData", "target": "demo"}).json()
        ri = g["Email_Masuk"][0]["row_index"]
        text = f"TEST_followup_{int(time.time())}"

        r = session.post(
            BRIDGE,
            json={"target": "demo", "action": "updateStatusTindakLanjut", "row_index": ri, "status_text": text},
        ).json()
        assert r.get("ok") is True

        g2 = session.get(BRIDGE, params={"action": "getAllData", "target": "demo"}).json()
        row = next(x for x in g2["Email_Masuk"] if x["row_index"] == ri)
        assert row["status_tindak_lanjut"] == text


# ---------- CRITICAL SAFETY -----------------------------------------------------
class TestSafety:
    def test_unknown_action_demo_returns_error(self, session):
        r = session.post(BRIDGE, json={"target": "demo", "action": "bogus"}).json()
        assert r.get("ok") is False
        assert "Unknown action" in r.get("error", "")
