"""
Integration and API Endpoint Tests
Tests endpoints:
- /api/health
- /api/dashboard/summary
- /api/applications (POST, GET)
- /api/dataset/info and /api/model/info
- /api/auth/login and protected /api/admin reviews
"""
import pytest
from app import create_app
from app.config import Config
from app.extensions import db
from app.models.admin_user import AdminUser
from app.models.application import LoanApplication

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

def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "AgriCredit" in data["service"]

def test_create_application_validation(client):
    # Invalid missing farmer name
    bad_payload = {
        "farmer": {"district": "Anand", "state": "Gujarat"},
        "requested_loan_amount": 50000.0,
    }
    res = client.post("/api/applications", json=bad_payload)
    assert res.status_code == 400

    # Invalid zero loan amount
    zero_amount_payload = {
        "farmer": {"farmer_name": "Test Farmer", "district": "Anand", "state": "Gujarat"},
        "requested_loan_amount": 0.0,
    }
    res2 = client.post("/api/applications", json=zero_amount_payload)
    assert res2.status_code == 400

def test_create_valid_application_and_auto_assessment(client):
    payload = {
        "farmer": {
            "farmer_name": "Suresh Kumar",
            "district": "Nagpur",
            "state": "Maharashtra",
            "contact_number": "+91 98220 12345",
            "farming_experience_years": 15,
            "land_ownership": "owned",
            "total_landholding_acres": 5.0,
            "cultivated_land_current_season_acres": 5.0,
        },
        "requested_loan_amount": 120000.0,
        "loan_purpose": "seeds",
        "requested_loan_tenure_months": 12,
        "repayment_frequency": "seasonal",
        "previous_loan_history": "clean",
        "existing_outstanding_debt": 15000.0,
        "existing_periodic_repayment": 3000.0,
        "other_verified_annual_income": 30000.0,
        "subsidy_received": 6000.0,
        "subsidy_pending_approved": 0.0,
        "subsidy_applied_unapproved": 0.0,
        "crops": [
            {
                "crop_name": "Cotton",
                "season": "Kharif",
                "cultivated_area_acres": 5.0,
                "expected_yield_per_acre": 8.0,
                "yield_unit": "Quintal",
                "expected_price_per_yield_unit": 6500.0,
                "seed_cost": 15000.0,
                "fertilizer_cost": 20000.0,
                "pesticide_cost": 12000.0,
                "labour_cost": 25000.0,
                "irrigation_cost": 10000.0,
                "machinery_cost": 12000.0,
                "other_cost": 5000.0,
            }
        ],
    }

    res = client.post("/api/applications", json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert "application" in data
    assert "assessment" in data
    app_id = data["application"]["id"]

    # Verify retrieval
    get_res = client.get(f"/api/applications/{app_id}")
    assert get_res.status_code == 200
    app_details = get_res.get_json()["application"]
    assert app_details["farmer"]["farmer_name"] == "Suresh Kumar"
    assert len(app_details["crops"]) == 1
    assert app_details["cashflow_assessment"] is not None

def test_dataset_and_model_info_endpoints(client):
    d_res = client.get("/api/dataset/info")
    assert d_res.status_code == 200
    d_data = d_res.get_json()["dataset_info"]
    assert d_data["is_synthetic"] is True
    assert "repayment_difficulty" in d_data["target_definition"]["name"]

    m_res = client.get("/api/model/info")
    assert m_res.status_code == 200
    m_data = m_res.get_json()["model_info"]
    assert "Random Forest" in m_data["algorithm"]
    assert len(m_data["limitations"]) > 0

def test_auth_and_human_review_workflow(client):
    # 1. Login with seeded admin credentials
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "AgriAdmin@2026"})
    assert login_res.status_code == 200
    token = login_res.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.get_json()["user"]["username"] == "admin"

    # 3. Create test application
    app_payload = {
        "farmer": {"farmer_name": "Review Test", "district": "Nashik", "state": "Maharashtra"},
        "requested_loan_amount": 50000.0,
        "crops": [],
    }
    create_res = client.post("/api/applications", json=app_payload)
    app_id = create_res.get_json()["application"]["id"]

    # 4. Attempt review without token (expect 401)
    unauth_res = client.post(f"/api/admin/applications/{app_id}/review", json={"review_decision": "SUPPORTED", "officer_notes": "Looks good."})
    assert unauth_res.status_code == 401

    # 5. Submit review with token
    review_payload = {
        "review_decision": "SUPPORTED",
        "officer_notes": "Field inspection confirmed drip irrigation and crop stand. Recommended for sanction.",
        "recommended_loan_amount": 48000.0,
    }
    review_res = client.post(f"/api/admin/applications/{app_id}/review", json=review_payload, headers=headers)
    assert review_res.status_code == 200
    assert review_res.get_json()["application_status"] == "REVIEWED_SUPPORTIVE"

    # 6. Verify application reflects status
    app_res = client.get(f"/api/applications/{app_id}")
    assert app_res.get_json()["application"]["status"] == "REVIEWED_SUPPORTIVE"
    assert len(app_res.get_json()["application"]["human_reviews"]) == 1
