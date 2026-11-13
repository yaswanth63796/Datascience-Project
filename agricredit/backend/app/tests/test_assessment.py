"""
Unit Tests for Assessment Edge Cases and Fallback Behavior
Tests:
- Area validation (crop area exceeding cultivated acreage)
- Negative surplus
- Model prediction fallback when artifact is missing
- High debt burden manual review flag
"""
import pytest
from app.services.cashflow_service import CashFlowService
import os
import sys

ml_src = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml", "src"))
if ml_src not in sys.path:
    sys.path.append(ml_src)

from predict import AgriModelPredictor

def test_crop_area_exceeding_cultivated_land_flagged():
    farmer = {
        "total_landholding_acres": 4.0,
        "cultivated_land_current_season_acres": 3.0,
    }
    app_data = {
        "requested_loan_amount": 50000.0,
        "requested_loan_tenure_months": 12,
        "other_verified_annual_income": 0.0,
    }
    # Crops sum to 5 acres, which is greater than reported 3 acres
    crops = [
        {
            "crop_name": "Paddy",
            "cultivated_area_acres": 3.0,
            "expected_yield_per_acre": 15.0,
            "expected_price_per_yield_unit": 2000.0,
            "seed_cost": 5000.0,
            "fertilizer_cost": 5000.0,
            "pesticide_cost": 2000.0,
            "labour_cost": 8000.0,
            "irrigation_cost": 3000.0,
            "machinery_cost": 4000.0,
            "other_cost": 1000.0,
        },
        {
            "crop_name": "Maize",
            "cultivated_area_acres": 2.0,
            "expected_yield_per_acre": 20.0,
            "expected_price_per_yield_unit": 1800.0,
            "seed_cost": 4000.0,
            "fertilizer_cost": 4000.0,
            "pesticide_cost": 2000.0,
            "labour_cost": 6000.0,
            "irrigation_cost": 2000.0,
            "machinery_cost": 3000.0,
            "other_cost": 1000.0,
        },
    ]

    res = CashFlowService.evaluate_agricultural_cashflow(farmer, app_data, crops)
    assert any("exceeds reported seasonal cultivated land" in note for note in res["cashflow_notes"])

def test_negative_surplus_triggers_manual_review():
    farmer = {"total_landholding_acres": 3.0, "cultivated_land_current_season_acres": 3.0}
    app_data = {"requested_loan_amount": 60000.0, "requested_loan_tenure_months": 12}
    # Cultivation cost (45,000) exceeds harvest revenue (30,000)
    crops = [
        {
            "crop_name": "Cotton",
            "cultivated_area_acres": 3.0,
            "expected_yield_per_acre": 2.0,  # Crop damage
            "expected_price_per_yield_unit": 5000.0,  # Gross revenue = 30,000
            "seed_cost": 8000.0,
            "fertilizer_cost": 10000.0,
            "pesticide_cost": 7000.0,
            "labour_cost": 12000.0,
            "irrigation_cost": 4000.0,
            "machinery_cost": 3000.0,
            "other_cost": 1000.0,  # Total cost = 45,000
        }
    ]

    res = CashFlowService.evaluate_agricultural_cashflow(farmer, app_data, crops)
    assert res["estimated_agricultural_operating_surplus"] < 0
    assert res["cashflow_verdict"] == "MANUAL_REVIEW"
    assert any("operating deficit" in note for note in res["cashflow_notes"])

def test_model_predictor_graceful_fallback():
    # Pass non-existent path to simulate missing model artifact
    predictor = AgriModelPredictor(model_path="/tmp/non_existent_model_artifact.joblib")
    farmer = {"total_landholding_acres": 5.0, "farming_experience_years": 10}
    app = {"requested_loan_amount": 50000.0, "requested_loan_tenure_months": 12}
    crops = [{"crop_name": "Paddy"}]
    cf = {"total_seasonal_crop_revenue": 100000.0, "total_seasonal_cultivation_cost": 50000.0, "estimated_agricultural_operating_surplus": 50000.0}

    pred_res = predictor.predict_risk(farmer, app, crops, cf)
    assert pred_res["is_fallback"] is True
    assert "not found" in pred_res["fallback_reason"].lower() or "missing" in pred_res["fallback_reason"].lower()
    assert pred_res["repayment_difficulty_probability"] is None

def test_loan_decision_yes_eligible():
    from app.services.assessment_service import AssessmentService
    app_data = {
        "requested_loan_amount": 100000.0,
        "requested_loan_tenure_months": 12,
        "previous_loan_history": "clean",
    }
    cf = {
        "cashflow_verdict": "ASSESSMENT_SUPPORTIVE",
        "debt_service_coverage_ratio": 1.65,
        "estimated_agricultural_operating_surplus": 120000.0,
        "total_seasonal_cultivation_cost": 80000.0,
        "total_seasonal_crop_revenue": 200000.0,
        "existing_debt_service_period": 0.0,
        "assumed_annual_interest_rate_pct": 7.0,
    }
    ml = {"predicted_risk_class": "LOW_RISK", "repayment_difficulty_probability": 0.08}
    dec = AssessmentService.compute_loan_decision(app_data, cashflow_dict=cf, ml_dict=ml)
    assert dec["can_give_loan"] == "YES"
    assert dec["decision_badge"] == "ELIGIBLE"
    assert dec["max_recommended_loan_amount"] >= 100000.0
    assert len(dec["reasons"]) > 0

def test_loan_decision_no_due_to_operating_deficit():
    from app.services.assessment_service import AssessmentService
    app_data = {
        "requested_loan_amount": 80000.0,
        "requested_loan_tenure_months": 12,
        "previous_loan_history": "first_time_borrower",
    }
    cf = {
        "cashflow_verdict": "MANUAL_REVIEW",
        "debt_service_coverage_ratio": 0.45,
        "estimated_agricultural_operating_surplus": -25000.0,
        "total_seasonal_cultivation_cost": 65000.0,
        "total_seasonal_crop_revenue": 40000.0,
        "existing_debt_service_period": 10000.0,
        "assumed_annual_interest_rate_pct": 7.0,
    }
    ml = {"predicted_risk_class": "ELEVATED_RISK", "repayment_difficulty_probability": 0.65}
    dec = AssessmentService.compute_loan_decision(app_data, cashflow_dict=cf, ml_dict=ml)
    assert dec["can_give_loan"] == "NO"
    assert dec["decision_badge"] == "NOT_RECOMMENDED"
    assert dec["max_recommended_loan_amount"] == 0.0
    assert any("deficit" in r.lower() or "ratio" in r.lower() for r in dec["reasons"])

def test_loan_decision_conditional_due_to_overleveraging():
    from app.services.assessment_service import AssessmentService
    app_data = {
        "requested_loan_amount": 200000.0,
        "requested_loan_tenure_months": 12,
        "previous_loan_history": "clean",
    }
    # Surplus is positive (45,000), but cannot support full 2,00,000
    cf = {
        "cashflow_verdict": "MANUAL_REVIEW",
        "debt_service_coverage_ratio": 1.10,
        "estimated_agricultural_operating_surplus": 45000.0,
        "total_seasonal_cultivation_cost": 50000.0,
        "total_seasonal_crop_revenue": 95000.0,
        "existing_debt_service_period": 0.0,
        "assumed_annual_interest_rate_pct": 7.0,
    }
    ml = {"predicted_risk_class": "MODERATE_RISK", "repayment_difficulty_probability": 0.22}
    dec = AssessmentService.compute_loan_decision(app_data, cashflow_dict=cf, ml_dict=ml)
    assert dec["can_give_loan"] == "CONDITIONAL"
    assert dec["decision_badge"] == "CONDITIONAL_SANCTION"
    assert 0 < dec["max_recommended_loan_amount"] < 200000.0
    assert len(dec["conditions"]) > 0
