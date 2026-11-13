"""
Agricultural Cash-Flow Assessment Service
Performs deterministic financial and farm economics calculations.
Strictly separates mathematical cash-flow analysis from machine learning predictions.
"""
from typing import Dict, Any, List, Optional
import math
from app.services.subsidy_service import SubsidyService

class CashFlowService:
    @staticmethod
    def calculate_single_crop_economics(crop: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates revenue, cost, and surplus for a single crop entry.
        """
        area = max(0.0, float(crop.get("cultivated_area_acres") or 0.0))
        expected_yield = max(0.0, float(crop.get("expected_yield_per_acre") or 0.0))
        price = max(0.0, float(crop.get("expected_price_per_yield_unit") or 0.0))
        cycles = max(1, int(crop.get("cycles_count") or 1))

        gross_revenue = round(area * expected_yield * price * cycles, 2)

        seed = max(0.0, float(crop.get("seed_cost") or 0.0))
        fert = max(0.0, float(crop.get("fertilizer_cost") or 0.0))
        pest = max(0.0, float(crop.get("pesticide_cost") or 0.0))
        labour = max(0.0, float(crop.get("labour_cost") or 0.0))
        irrig = max(0.0, float(crop.get("irrigation_cost") or 0.0))
        mach = max(0.0, float(crop.get("machinery_cost") or 0.0))
        other = max(0.0, float(crop.get("other_cost") or 0.0))

        cost_per_cycle = seed + fert + pest + labour + irrig + mach + other
        total_cost = round(cost_per_cycle * cycles, 2)
        surplus = round(gross_revenue - total_cost, 2)

        cost_breakdown = {
            "seed_cost": seed * cycles,
            "fertilizer_cost": fert * cycles,
            "pesticide_cost": pest * cycles,
            "labour_cost": labour * cycles,
            "irrigation_cost": irrig * cycles,
            "machinery_cost": mach * cycles,
            "other_cost": other * cycles,
        }

        return {
            "crop_name": crop.get("crop_name", "Unknown Crop"),
            "season": crop.get("season", "Kharif"),
            "cultivated_area_acres": area,
            "expected_yield_per_acre": expected_yield,
            "yield_unit": crop.get("yield_unit", "Quintal"),
            "expected_price_per_yield_unit": price,
            "cycles_count": cycles,
            "gross_revenue": gross_revenue,
            "total_cultivation_cost": total_cost,
            "estimated_crop_surplus": surplus,
            "cost_breakdown": cost_breakdown,
        }

    @staticmethod
    def calculate_loan_amortization(
        principal: float,
        tenure_months: int,
        annual_interest_rate_pct: float
    ) -> Dict[str, Any]:
        """
        Calculates monthly and seasonal loan repayment installment.
        Uses standard French amortization with transparent assumption labeling.
        """
        p = max(0.0, float(principal or 0.0))
        n = max(1, int(tenure_months or 12))
        r_annual = max(0.0, float(annual_interest_rate_pct or 7.0))
        r_monthly = (r_annual / 100.0) / 12.0

        if p == 0:
            return {
                "monthly_installment": 0.0,
                "seasonal_installment_6m": 0.0,
                "total_repayment": 0.0,
                "total_interest": 0.0,
                "assumed_annual_rate_pct": r_annual,
            }

        if r_monthly > 0:
            emi = p * (r_monthly * math.pow(1 + r_monthly, n)) / (math.pow(1 + r_monthly, n) - 1)
        else:
            emi = p / n

        emi = round(emi, 2)
        total_repayment = round(emi * n, 2)
        total_interest = round(total_repayment - p, 2)
        
        # 6-month seasonal debt obligation
        months_in_season = min(6, n)
        seasonal_installment = round(emi * months_in_season, 2)

        return {
            "monthly_installment": emi,
            "seasonal_installment_6m": seasonal_installment,
            "total_repayment": total_repayment,
            "total_interest": total_interest,
            "assumed_annual_rate_pct": r_annual,
        }

    @staticmethod
    def calculate_max_supportable_loan(
        operating_cash_inflow: float,
        existing_debt_service_seasonal: float,
        tenure_months: int,
        annual_interest_rate_pct: float,
        target_dscr: float = 1.25,
    ) -> float:
        """
        Calculates maximum financially supportable loan amount based on operational cash flow
        and target DSCR safety benchmark (default 1.25).
        """
        if operating_cash_inflow <= 0:
            return 0.0

        # Max seasonal debt service allowed to maintain target DSCR
        max_allowable_seasonal_debt_service = operating_cash_inflow / max(0.5, target_dscr)
        
        # Max seasonal installment available for the proposed loan
        max_proposed_seasonal_installment = max(0.0, max_allowable_seasonal_debt_service - existing_debt_service_seasonal)
        if max_proposed_seasonal_installment <= 0:
            return 0.0

        n = max(1, int(tenure_months or 12))
        months_in_season = min(6, n)
        monthly_emi_capacity = max_proposed_seasonal_installment / months_in_season

        r_annual = max(0.0, float(annual_interest_rate_pct or 7.0))
        r_monthly = (r_annual / 100.0) / 12.0

        if r_monthly > 0:
            discount_factor = (math.pow(1 + r_monthly, n) - 1) / (r_monthly * math.pow(1 + r_monthly, n))
            max_principal = monthly_emi_capacity * discount_factor
        else:
            max_principal = monthly_emi_capacity * n

        # Round down to nearest 500 for practical banking disbursement sanction
        max_principal = math.floor(max_principal / 500.0) * 500.0
        return max(0.0, round(max_principal, 2))

    @classmethod
    def evaluate_agricultural_cashflow(
        cls,
        farmer_data: Dict[str, Any],
        application_data: Dict[str, Any],
        crops_data: List[Dict[str, Any]],
        assumed_interest_rate: float = 7.0,
    ) -> Dict[str, Any]:
        """
        Evaluates full agricultural cash-flow and debt-service coverage.
        Returns detailed financial breakdown and transparent verdict.
        """
        notes = []
        is_insufficient = False

        # 1. Multi-crop analysis
        crop_evaluations = []
        total_crop_revenue = 0.0
        total_cultivation_cost = 0.0
        total_crop_area = 0.0

        for crop in crops_data:
            eval_res = cls.calculate_single_crop_economics(crop)
            crop_evaluations.append(eval_res)
            total_crop_revenue += eval_res["gross_revenue"]
            total_cultivation_cost += eval_res["total_cultivation_cost"]
            total_crop_area += eval_res["cultivated_area_acres"]

        total_crop_revenue = round(total_crop_revenue, 2)
        total_cultivation_cost = round(total_cultivation_cost, 2)
        farm_operating_surplus = round(total_crop_revenue - total_cultivation_cost, 2)

        # Cultivated area consistency validation
        reported_cultivated = float(farmer_data.get("cultivated_land_current_season_acres") or 0.0)
        total_holding = float(farmer_data.get("total_landholding_acres") or 0.0)

        if len(crops_data) == 0:
            notes.append("No crop details provided. Farm operating revenue cannot be established.")
            is_insufficient = True
        elif total_crop_area > reported_cultivated and reported_cultivated > 0:
            notes.append(
                f"Sum of crop areas ({total_crop_area:.2f} acres) exceeds reported seasonal cultivated land ({reported_cultivated:.2f} acres). Requires sequential/intercropping documentation."
            )

        if total_holding > 0 and reported_cultivated > total_holding:
            notes.append(
                f"Reported cultivated acreage ({reported_cultivated:.2f} acres) exceeds total owned/leased landholding ({total_holding:.2f} acres)."
            )

        # 2. Time-period alignment: Standard 6-month seasonal horizon
        annual_other_income = max(0.0, float(application_data.get("other_verified_annual_income") or 0.0))
        seasonal_other_income = round(annual_other_income * 0.5, 2)  # 6 months of annual other income

        # 3. Subsidies audit
        subsidy_audit = SubsidyService.audit_subsidy_profile(
            scheme_name=application_data.get("subsidy_scheme_name", ""),
            received_inr=application_data.get("subsidy_received", 0.0),
            pending_approved_inr=application_data.get("subsidy_pending_approved", 0.0),
            applied_unapproved_inr=application_data.get("subsidy_applied_unapproved", 0.0),
        )
        confirmed_subsidy = subsidy_audit["confirmed_cash_received"]
        pending_approved_subsidy = subsidy_audit["contingent_approved_pending"]
        for w in subsidy_audit["warnings"]:
            notes.append(w)

        # 4. Existing debt service
        existing_debt_total = max(0.0, float(application_data.get("existing_outstanding_debt") or 0.0))
        existing_periodic = max(0.0, float(application_data.get("existing_periodic_repayment") or 0.0))
        
        # If periodic repayment is monthly, 6-month seasonal obligation is 6x
        repayment_freq = application_data.get("repayment_frequency", "seasonal").lower()
        if repayment_freq == "monthly":
            existing_debt_service_seasonal = round(existing_periodic * 6.0, 2)
        else:
            existing_debt_service_seasonal = round(existing_periodic, 2)

        # 5. Proposed loan amortization
        requested_loan = max(0.0, float(application_data.get("requested_loan_amount") or 0.0))
        tenure_months = max(1, int(application_data.get("requested_loan_tenure_months") or 12))

        if requested_loan <= 0:
            notes.append("Requested loan amount is zero or negative.")
            is_insufficient = True

        amortization = cls.calculate_loan_amortization(
            principal=requested_loan,
            tenure_months=tenure_months,
            annual_interest_rate_pct=assumed_interest_rate,
        )
        proposed_monthly_installment = amortization["monthly_installment"]
        proposed_debt_service_seasonal = amortization["seasonal_installment_6m"]

        # 6. Aggregate Cash Flow & Debt Service Coverage
        # Cash inflow available before servicing debt
        operating_cash_inflow = round(farm_operating_surplus + seasonal_other_income + confirmed_subsidy, 2)
        total_debt_service_seasonal = round(existing_debt_service_seasonal + proposed_debt_service_seasonal, 2)
        net_available_cashflow = round(operating_cash_inflow - total_debt_service_seasonal, 2)

        # Calculate DSCR (Debt Service Coverage Ratio)
        dscr: Optional[float] = None
        if total_debt_service_seasonal > 0:
            dscr = round(operating_cash_inflow / total_debt_service_seasonal, 2)
        elif operating_cash_inflow > 0:
            dscr = 99.0  # Zero debt service with positive income

        # 7. Verdict Logic
        if is_insufficient or (total_crop_revenue == 0 and annual_other_income == 0):
            verdict = "INSUFFICIENT_DATA"
            notes.append("Insufficient farming economics data to complete formal cash-flow assessment.")
        elif farm_operating_surplus < 0:
            verdict = "MANUAL_REVIEW"
            notes.append(
                f"Estimated farming operating deficit of ₹{abs(farm_operating_surplus):,.2f}. Cultivation expenses exceed expected harvest revenue."
            )
        elif dscr is not None and dscr < 1.0:
            verdict = "MANUAL_REVIEW"
            notes.append(
                f"Debt Service Coverage Ratio (DSCR) is {dscr:.2f} (< 1.00 benchmark). Projected net agricultural cashflow is inadequate to service combined debt without restructuring or collateral."
            )
        elif dscr is not None and dscr < 1.25:
            verdict = "MANUAL_REVIEW"
            notes.append(
                f"Debt Service Coverage Ratio (DSCR) is {dscr:.2f} (between 1.00 and 1.25). Cash-flow buffer is narrow against weather/price shocks."
            )
        elif requested_loan > (total_cultivation_cost * 2.0) and requested_loan > 300000.0:
            verdict = "MANUAL_REVIEW"
            notes.append(
                f"Requested loan amount (₹{requested_loan:,.2f}) significantly exceeds seasonal cultivation cost (₹{total_cultivation_cost:,.2f}). Requires capital expenditure review."
            )
        else:
            verdict = "ASSESSMENT_SUPPORTIVE"
            notes.append(
                f"Cash-flow appears financially supportive. DSCR of {dscr if dscr is not None else 'N/A'} indicates sufficient operational surplus to cover debt obligations under assumed terms."
            )

        # Calculate maximum supportable loan amount
        max_supportable_loan = cls.calculate_max_supportable_loan(
            operating_cash_inflow=operating_cash_inflow,
            existing_debt_service_seasonal=existing_debt_service_seasonal,
            tenure_months=tenure_months,
            annual_interest_rate_pct=assumed_interest_rate,
            target_dscr=1.25,
        )

        return {
            "crops": crop_evaluations,
            "total_seasonal_crop_revenue": total_crop_revenue,
            "total_seasonal_cultivation_cost": total_cultivation_cost,
            "estimated_agricultural_operating_surplus": farm_operating_surplus,
            "operating_cash_inflow": operating_cash_inflow,
            "verified_other_income_period": seasonal_other_income,
            "confirmed_subsidy_period": confirmed_subsidy,
            "pending_subsidy_tracked": pending_approved_subsidy,
            "existing_debt_service_period": existing_debt_service_seasonal,
            "proposed_loan_installment_monthly": proposed_monthly_installment,
            "proposed_debt_service_period": proposed_debt_service_seasonal,
            "total_debt_service_period": total_debt_service_seasonal,
            "estimated_net_available_cashflow": net_available_cashflow,
            "debt_service_coverage_ratio": dscr,
            "assumed_annual_interest_rate_pct": assumed_interest_rate,
            "amortization_details": amortization,
            "max_supportable_loan_amount": max_supportable_loan,
            "cashflow_verdict": verdict,
            "cashflow_notes": notes,
        }
