"""
Tests for Agricultural Loan Eligibility Prediction API
Endpoint: POST /api/agricredit/predict-eligibility
"""
import pytest
from app import create_app
from app.config import Config

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

def test_predict_eligibility_potentially_eligible(client):
    payload = {
        "total_land_area": 10.0,
        "area_planted": 7.5,
        "crop_type": "Rice",
        "expected_crop_yield": 15000.0,
        "crop_insurance_amount": 50000.0,
        "cce_crop_yield": 14000.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["assessment"] == "Potentially Eligible"
    assert "Agricultural indicators appear positive" in data["message"]
    assert data["metrics"]["planted_area_ratio"] == 75.0
    assert abs(data["metrics"]["yield_variation_percent"] - 7.14) < 0.05
    assert data["metrics"]["crop_insurance_amount"] == 50000.0
    assert "disclaimer" in data
    assert "preliminary assessment" in data["disclaimer"].lower()

def test_predict_eligibility_manual_review_on_yield_deviation(client):
    # Expected yield (18,000 kg) is +50% above CCE (12,000 kg)
    payload = {
        "total_land_area": 8.0,
        "area_planted": 6.0,
        "crop_type": "Wheat",
        "expected_crop_yield": 18000.0,
        "crop_insurance_amount": 30000.0,
        "cce_crop_yield": 12000.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["assessment"] == "Manual Review Required"
    assert data["metrics"]["yield_variation_percent"] == 50.0

def test_predict_eligibility_safe_zero_cce_yield(client):
    # CCE yield is 0 (not conducted or unrecorded)
    payload = {
        "total_land_area": 5.0,
        "area_planted": 4.0,
        "crop_type": "Maize",
        "expected_crop_yield": 8000.0,
        "crop_insurance_amount": 25000.0,
        "cce_crop_yield": 0.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["assessment"] == "Manual Review Required"
    # Zero CCE yield safely handled: yield_variation_percent must be None
    assert data["metrics"]["yield_variation_percent"] is None
    assert data["metrics"]["cce_crop_yield"] == 0.0
    assert any("CCE reference yield is 0 or unavailable" in r for r in data["reasons"])

def test_predict_eligibility_commercial_crop_zero_insurance(client):
    # Cotton without insurance
    payload = {
        "total_land_area": 6.0,
        "area_planted": 5.0,
        "crop_type": "Cotton",
        "expected_crop_yield": 6000.0,
        "crop_insurance_amount": 0.0,
        "cce_crop_yield": 5800.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["assessment"] == "Manual Review Required"
    assert any("commercial crop" in r.lower() for r in data["reasons"])

def test_predict_eligibility_not_eligible_low_planted_ratio(client):
    # Only 1 acre out of 10 planted (10% < 20%)
    payload = {
        "total_land_area": 10.0,
        "area_planted": 1.0,
        "crop_type": "Wheat",
        "expected_crop_yield": 1500.0,
        "crop_insurance_amount": 10000.0,
        "cce_crop_yield": 1400.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["assessment"] == "Potentially Not Eligible"
    assert data["metrics"]["planted_area_ratio"] == 10.0

def test_predict_eligibility_not_eligible_severe_yield_collapse(client):
    # Expected yield is 70% below CCE and 0 insurance
    payload = {
        "total_land_area": 5.0,
        "area_planted": 4.0,
        "crop_type": "Rice",
        "expected_crop_yield": 3000.0,
        "crop_insurance_amount": 0.0,
        "cce_crop_yield": 10000.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["assessment"] == "Potentially Not Eligible"
    assert data["metrics"]["yield_variation_percent"] == -70.0

def test_predict_eligibility_validation_planted_exceeds_total(client):
    payload = {
        "total_land_area": 5.0,
        "area_planted": 8.0,  # 8 > 5
        "crop_type": "Rice",
        "expected_crop_yield": 10000.0,
        "crop_insurance_amount": 20000.0,
        "cce_crop_yield": 9500.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "area_planted" in data["field_errors"]
    assert "cannot exceed total land area" in data["field_errors"]["area_planted"]

def test_predict_eligibility_validation_negative_values(client):
    payload = {
        "total_land_area": -5.0,
        "area_planted": -2.0,
        "crop_type": "Rice",
        "expected_crop_yield": -100.0,
        "crop_insurance_amount": -500.0,
        "cce_crop_yield": -10.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "total_land_area" in data["field_errors"]
    assert "area_planted" in data["field_errors"]
    assert "expected_crop_yield" in data["field_errors"]
    assert "crop_insurance_amount" in data["field_errors"]
    assert "cce_crop_yield" in data["field_errors"]

def test_predict_eligibility_validation_missing_and_invalid_crop(client):
    payload = {
        "total_land_area": 10.0,
        "area_planted": 5.0,
        "crop_type": "Pineapple",  # Not in allowed list
        "expected_crop_yield": 8000.0,
        "crop_insurance_amount": 10000.0,
        "cce_crop_yield": 8000.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "crop_type" in data["field_errors"]

def test_predict_eligibility_missing_fields(client):
    payload = {
        "total_land_area": 10.0,
    }
    res = client.post("/api/agricredit/predict-eligibility", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "area_planted" in data["field_errors"]
    assert "crop_type" in data["field_errors"]
    assert "expected_crop_yield" in data["field_errors"]
    assert "crop_insurance_amount" in data["field_errors"]
    assert "cce_crop_yield" in data["field_errors"]
