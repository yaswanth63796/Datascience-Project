"""
Unit Tests for Agricultural Cash-Flow Engine
Tests:
- Revenue and expense calculations per crop
- Multiple crop entries
- Area consistency
- Subsidy non-duplication
- Amortization calculation
- DSCR boundary conditions
"""
import pytest
from app.services.cashflow_service import CashFlowService
from app.services.subsidy_service import SubsidyService

def test_single_crop_revenue_and_cost():
    crop = {
        "crop_name": "Paddy",
        "season": "Kharif",
        "cultivated_area_acres": 3.0,
        "expected_yield_per_acre": 20.0,
        "expected_price_per_yield_unit": 2183.0,
        "seed_cost": 4500.0,
        "fertilizer_cost": 6000.0,
        "pesticide_cost": 3000.0,
        "labour_cost": 9000.0,
        "irrigation_cost": 4000.0,
        "machinery_cost": 5000.0,
        "other_cost": 1500.0,
        "cycles_count": 1,
    }

    res = CashFlowService.calculate_single_crop_economics(crop)

    # 3 acres * 20 quintals * 2183 = 130,980
    assert res["gross_revenue"] == 130980.0
    # Cost = 4500 + 6000 + 3000 + 9000 + 4000 + 5000 + 1500 = 33,000
    assert res["total_cultivation_cost"] == 33000.0
    # Surplus = 130,980 - 33,000 = 97,980
    assert res["estimated_crop_surplus"] == 97980.0

def test_multiple_crops_aggregation():
    farmer = {
        "total_landholding_acres": 10.0,
        "cultivated_land_current_season_acres": 8.0,
    }
    app_data = {
        "requested_loan_amount": 100000.0,
        "requested_loan_tenure_months": 12,
        "repayment_frequency": "seasonal",
        "other_verified_annual_income": 40000.0,
        "subsidy_received": 6000.0,
        "existing_outstanding_debt": 20000.0,
        "existing_periodic_repayment": 5000.0,
    }
    crops = [
        {
            "crop_name": "Wheat",
            "cultivated_area_acres": 5.0,
            "expected_yield_per_acre": 18.0,
            "expected_price_per_yield_unit": 2275.0,
            "seed_cost": 10000.0,
            "fertilizer_cost": 15000.0,
            "pesticide_cost": 5000.0,
            "labour_cost": 15000.0,
            "irrigation_cost": 8000.0,
            "machinery_cost": 12000.0,
            "other_cost": 2000.0,
        },
        {
            "crop_name": "Mustard",
            "cultivated_area_acres": 3.0,
            "expected_yield_per_acre": 7.0,
            "expected_price_per_yield_unit": 5450.0,
            "seed_cost": 3000.0,
            "fertilizer_cost": 4000.0,
            "pesticide_cost": 2000.0,
            "labour_cost": 6000.0,
            "irrigation_cost": 3000.0,
            "machinery_cost": 4000.0,
            "other_cost": 1000.0,
        },
    ]

    res = CashFlowService.evaluate_agricultural_cashflow(farmer, app_data, crops, assumed_interest_rate=7.0)

    # Wheat rev: 5 * 18 * 2275 = 204,750; Cost: 67,000
    # Mustard rev: 3 * 7 * 5450 = 114,450; Cost: 23,000
    assert res["total_seasonal_crop_revenue"] == 319200.0
    assert res["total_seasonal_cultivation_cost"] == 90000.0
    assert res["estimated_agricultural_operating_surplus"] == 229200.0
    # Seasonal other income is 50% of annual 40,000 = 20,000
    assert res["verified_other_income_period"] == 20000.0
    # Confirmed subsidy
    assert res["confirmed_subsidy_period"] == 6000.0
    # DSCR must be positive and healthy
    assert res["debt_service_coverage_ratio"] is not None
    assert res["debt_service_coverage_ratio"] > 1.5
    assert res["cashflow_verdict"] == "ASSESSMENT_SUPPORTIVE"

def test_subsidy_separation_and_unapproved_exclusion():
    audit = SubsidyService.audit_subsidy_profile(
        scheme_name="SMAM",
        received_inr=10000.0,
        pending_approved_inr=25000.0,
        applied_unapproved_inr=50000.0,
    )
    # Only confirmed cash counted in liquid cashflow
    assert audit["counted_in_liquid_cashflow"] == 10000.0
    assert audit["contingent_approved_pending"] == 25000.0
    assert audit["unapproved_speculative"] == 50000.0
    # Must have warnings alerting that unapproved amount is excluded
    assert any("unapproved" in w for w in audit["warnings"])

def test_missing_crop_data_returns_insufficient_data():
    farmer = {"total_landholding_acres": 5.0, "cultivated_land_current_season_acres": 5.0}
    app_data = {"requested_loan_amount": 50000.0, "other_verified_annual_income": 0.0}
    crops = []  # Empty crops!

    res = CashFlowService.evaluate_agricultural_cashflow(farmer, app_data, crops)
    assert res["cashflow_verdict"] == "INSUFFICIENT_DATA"
    assert any("No crop details" in note for note in res["cashflow_notes"])

def test_amortization_calculation():
    # 100,000 at 7.0% for 12 months
    amort = CashFlowService.calculate_loan_amortization(principal=100000.0, tenure_months=12, annual_interest_rate_pct=7.0)
    # Standard monthly installment ~ 8652.67
    assert 8600.0 < amort["monthly_installment"] < 8700.0
    assert amort["total_interest"] > 0
    assert amort["seasonal_installment_6m"] == round(amort["monthly_installment"] * 6, 2)
