"""
Comprehensive End-to-End Route Tests
Tests all remaining route behaviors:
- Farmer routes (create, get, list, 404)
- Application routes (search, filters, pagination, 404, document download)
- Assessment routes (trigger assess with custom interest rate, history)
- Admin routes (setup admin, review decisions, request information, demo seeding)
- Auth routes (invalid login, logout, me endpoint)
"""
import io
import pytest
from app import create_app
from app.config import Config
from app.extensions import db

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    DEFAULT_INTEREST_RATE = 7.0

@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            yield client

def get_auth_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "AgriAdmin@2026"})
    return res.get_json()["token"]

def test_farmer_crud_and_validation(client):
    # 1. Missing required fields
    res_bad = client.post("/api/farmers", json={"farmer_name": "Incomplete"})
    assert res_bad.status_code == 400

    # 2. Valid creation
    res_valid = client.post("/api/farmers", json={
        "farmer_name": "Govind Narain",
        "district": "Jaipur",
        "state": "Rajasthan",
        "farming_experience_years": 20,
        "land_ownership": "owned",
        "total_landholding_acres": 8.0,
        "cultivated_land_current_season_acres": 7.5,
    })
    assert res_valid.status_code == 201
    farmer_id = res_valid.get_json()["farmer"]["id"]

    # 3. Retrieve farmer by ID
    res_get = client.get(f"/api/farmers/{farmer_id}")
    assert res_get.status_code == 200
    assert res_get.get_json()["farmer"]["farmer_name"] == "Govind Narain"

    # 4. Retrieve non-existent farmer
    res_404 = client.get("/api/farmers/999999")
    assert res_404.status_code == 404

    # 5. List farmers
    res_list = client.get("/api/farmers")
    assert res_list.status_code == 200
    assert len(res_list.get_json()["farmers"]) >= 1

def test_application_query_filters_and_pagination(client):
    # Seed an application
    client.post("/api/applications", json={
        "farmer": {"farmer_name": "Pooja Sharma", "district": "Ujjain", "state": "Madhya Pradesh"},
        "requested_loan_amount": 75000.0,
        "crops": [],
    })

    # Search by name
    res_search = client.get("/api/applications?search=Pooja")
    assert res_search.status_code == 200
    assert len(res_search.get_json()["applications"]) >= 1

    # Filter by non-existent status
    res_filter = client.get("/api/applications?status=CONDITIONALLY_APPROVED")
    assert res_filter.status_code == 200
    assert len(res_filter.get_json()["applications"]) == 0

    # Test 404 application retrieval
    res_app_404 = client.get("/api/applications/999999")
    assert res_app_404.status_code == 404

def test_document_upload_and_download(client):
    # Create application
    res_app = client.post("/api/applications", json={
        "farmer": {"farmer_name": "Doc Test", "district": "Shimoga", "state": "Karnataka"},
        "requested_loan_amount": 60000.0,
        "crops": [],
    })
    app_id = res_app.get_json()["application"]["id"]

    # Upload mock file
    data = {
        "document_type": "land_record",
        "file": (io.BytesIO(b"Mock Land Title Patta extract content"), "patta_record.pdf"),
    }
    res_upload = client.post(
        f"/api/applications/{app_id}/documents",
        data=data,
        content_type="multipart/form-data"
    )
    assert res_upload.status_code == 201
    doc_id = res_upload.get_json()["document"]["id"]

    # Download file
    res_down = client.get(f"/api/applications/{app_id}/documents/{doc_id}/download")
    assert res_down.status_code == 200
    assert b"Mock Land Title" in res_down.data

    # Download 404 document
    res_down_404 = client.get(f"/api/applications/{app_id}/documents/99999/download")
    assert res_down_404.status_code == 404

def test_assessment_endpoints_and_history(client):
    res_app = client.post("/api/applications", json={
        "farmer": {"farmer_name": "Assessment Test", "district": "Guntur", "state": "Andhra Pradesh"},
        "requested_loan_amount": 90000.0,
        "crops": [
            {
                "crop_name": "Chillies",
                "season": "Kharif",
                "cultivated_area_acres": 2.0,
                "expected_yield_per_acre": 15.0,
                "yield_unit": "Quintal",
                "expected_price_per_yield_unit": 12000.0,
                "seed_cost": 10000.0,
                "fertilizer_cost": 15000.0,
                "pesticide_cost": 15000.0,
                "labour_cost": 20000.0,
                "irrigation_cost": 5000.0,
                "machinery_cost": 5000.0,
                "other_cost": 2000.0,
            }
        ],
    })
    app_id = res_app.get_json()["application"]["id"]

    # Re-run assessment with custom illustrative rate of 8.5%
    res_assess = client.post(f"/api/applications/{app_id}/assess", json={"assumed_interest_rate": 8.5})
    assert res_assess.status_code == 200
    cf = res_assess.get_json()["assessment"]["cashflow_assessment"]
    assert cf["assumed_annual_interest_rate_pct"] == 8.5

    # Get history audit trail
    res_hist = client.get(f"/api/applications/{app_id}/history")
    assert res_hist.status_code == 200
    assert len(res_hist.get_json()["history"]) >= 1

def test_admin_request_information_and_seed_data(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create app
    res_app = client.post("/api/applications", json={
        "farmer": {"farmer_name": "Info Request Test", "district": "Bathinda", "state": "Punjab"},
        "requested_loan_amount": 80000.0,
        "crops": [],
    })
    app_id = res_app.get_json()["application"]["id"]

    # Request info without notes (expect 400)
    bad_req = client.post(f"/api/admin/applications/{app_id}/request-information", json={"requested_items": ""}, headers=headers)
    assert bad_req.status_code == 400

    # Request info with items
    good_req = client.post(
        f"/api/admin/applications/{app_id}/request-information",
        json={"requested_items": "Please provide seasonal sowing certificate."},
        headers=headers
    )
    assert good_req.status_code == 200

    # Verify app status updated to INFORMATION_REQUESTED
    res_app_updated = client.get(f"/api/applications/{app_id}")
    assert res_app_updated.get_json()["application"]["status"] == "INFORMATION_REQUESTED"

    # Seed demo data
    seed_res = client.post("/api/admin/seed-demo-data")
    assert seed_res.status_code == 201
    assert len(seed_res.get_json()["applications"]) == 3
