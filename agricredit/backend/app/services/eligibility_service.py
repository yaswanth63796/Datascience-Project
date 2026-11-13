"""
Agricultural Loan Eligibility Prediction Service
Provides transparent, preliminary assessment of agricultural loan eligibility based on 
six essential agronomic and risk indicators:
1. Total Land Area (acres)
2. Area Planted (acres)
3. Crop Type
4. Expected Crop Yield (kg)
5. Crop Insurance Amount (₹)
6. CCE Crop Yield (kg)

Note: As verified during backend inspection, existing trained ML models in AgriCredit
evaluate full 17-feature loan repayment risk (requiring financial debt, revenue, costs, tenure).
No reliable historical dataset or trained ML model currently exists for 6-feature preliminary CCE-based eligibility.
Therefore, this service implements a transparent, explainable preliminary agronomic assessment engine,
structured modularly so a future trained scikit-learn model can be plugged in seamlessly.
"""
from typing import Dict, Any, List, Optional, Tuple
import os
import joblib

VALID_CROP_TYPES = [
    "Rice",
    "Wheat",
    "Maize",
    "Cotton",
    "Sugarcane",
    "Groundnut",
    "Other",
]

class AgriculturalLoanEligibilityService:
    """
    Service for validating inputs and evaluating agricultural loan eligibility.
    """
    def __init__(self, ml_model_path: Optional[str] = None):
        self.ml_model_path = ml_model_path
        self.ml_model = None
        if ml_model_path and os.path.exists(ml_model_path):
            try:
                self.ml_model = joblib.load(ml_model_path)
            except Exception as e:
                print(f"Warning: Failed to load eligibility ML model: {e}")
                self.ml_model = None

    @staticmethod
    def validate_inputs(data: Dict[str, Any]) -> Tuple[bool, Dict[str, str], Dict[str, Any]]:
        """
        Validates the 6 required inputs.
        Returns (is_valid, errors_dict, cleaned_data_dict).
        """
        errors: Dict[str, str] = {}
        cleaned: Dict[str, Any] = {}

        if not isinstance(data, dict):
            return False, {"_general": "Request body must be a valid JSON object."}, {}

        # 1. Total Land Area (acres)
        total_land = data.get("total_land_area")
        if total_land is None or total_land == "":
            errors["total_land_area"] = "Total land area is required."
        else:
            try:
                total_land_val = float(total_land)
                if total_land_val <= 0:
                    errors["total_land_area"] = "Total land area must be greater than zero."
                else:
                    cleaned["total_land_area"] = round(total_land_val, 2)
            except (ValueError, TypeError):
                errors["total_land_area"] = "Total land area must be a valid positive number."

        # 2. Area Planted (acres)
        area_planted = data.get("area_planted")
        if area_planted is None or area_planted == "":
            errors["area_planted"] = "Area planted is required."
        else:
            try:
                area_planted_val = float(area_planted)
                if area_planted_val < 0:
                    errors["area_planted"] = "Area planted cannot be negative."
                else:
                    cleaned["area_planted"] = round(area_planted_val, 2)
            except (ValueError, TypeError):
                errors["area_planted"] = "Area planted must be a valid number."

        # Check: Planted area must not exceed total land area
        if "total_land_area" in cleaned and "area_planted" in cleaned:
            if cleaned["area_planted"] > cleaned["total_land_area"]:
                errors["area_planted"] = (
                    f"Area planted ({cleaned['area_planted']} acres) cannot exceed "
                    f"total land area ({cleaned['total_land_area']} acres)."
                )

        # 3. Crop Type
        crop_type = data.get("crop_type")
        if not crop_type or not str(crop_type).strip():
            errors["crop_type"] = "Crop type is required. Please select a crop."
        else:
            norm_crop = str(crop_type).strip()
            # Case-insensitive match against valid crops
            matched_crop = next((c for c in VALID_CROP_TYPES if c.lower() == norm_crop.lower()), None)
            if matched_crop:
                cleaned["crop_type"] = matched_crop
            else:
                errors["crop_type"] = (
                    f"Invalid crop type '{norm_crop}'. Must be one of: {', '.join(VALID_CROP_TYPES)}."
                )

        # 4. Expected Crop Yield (kg)
        expected_yield = data.get("expected_crop_yield")
        if expected_yield is None or expected_yield == "":
            errors["expected_crop_yield"] = "Expected crop yield is required."
        else:
            try:
                expected_yield_val = float(expected_yield)
                if expected_yield_val < 0:
                    errors["expected_crop_yield"] = "Expected crop yield cannot be negative."
                else:
                    cleaned["expected_crop_yield"] = round(expected_yield_val, 2)
            except (ValueError, TypeError):
                errors["expected_crop_yield"] = "Expected crop yield must be a valid number."

        # 5. Crop Insurance Amount (₹)
        insurance = data.get("crop_insurance_amount")
        if insurance is None or insurance == "":
            errors["crop_insurance_amount"] = "Crop insurance amount is required."
        else:
            try:
                insurance_val = float(insurance)
                if insurance_val < 0:
                    errors["crop_insurance_amount"] = "Crop insurance amount cannot be negative."
                else:
                    cleaned["crop_insurance_amount"] = round(insurance_val, 2)
            except (ValueError, TypeError):
                errors["crop_insurance_amount"] = "Crop insurance amount must be a valid number."

        # 6. CCE Crop Yield (kg)
        cce_yield = data.get("cce_crop_yield")
        if cce_yield is None or cce_yield == "":
            errors["cce_crop_yield"] = "CCE crop yield is required."
        else:
            try:
                cce_yield_val = float(cce_yield)
                if cce_yield_val < 0:
                    errors["cce_crop_yield"] = "CCE crop yield cannot be negative."
                else:
                    cleaned["cce_crop_yield"] = round(cce_yield_val, 2)
            except (ValueError, TypeError):
                errors["cce_crop_yield"] = "CCE crop yield must be a valid number."

        return len(errors) == 0, errors, cleaned

    def assess_eligibility(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates derived metrics and evaluates loan eligibility.
        Assumes inputs are already validated.
        """
        total_land = cleaned_total_land = data["total_land_area"]
        area_planted = data["area_planted"]
        crop_type = data["crop_type"]
        expected_yield = data["expected_crop_yield"]
        insurance_amount = data["crop_insurance_amount"]
        cce_yield = data["cce_crop_yield"]

        # 1. Derived calculations
        planted_area_ratio = round((area_planted / total_land) * 100.0, 2) if total_land > 0 else 0.0

        # Safe yield variation calculation
        if cce_yield > 0:
            yield_variation_percent = round(((expected_yield - cce_yield) / cce_yield) * 100.0, 2)
            cce_assessment_note = (
                f"Expected yield of {expected_yield:,.0f} kg is compared to CCE reference yield of "
                f"{cce_yield:,.0f} kg, indicating a variation of {yield_variation_percent:+.1f}%."
            )
        else:
            yield_variation_percent = None
            cce_assessment_note = (
                "CCE crop yield was recorded as 0 or not conducted. Safe handling applied; "
                "yield variation cannot be calculated."
            )

        # Per acre calculations for granular transparency
        expected_yield_per_acre = round(expected_yield / area_planted, 2) if area_planted > 0 else 0.0
        cce_yield_per_acre = round(cce_yield / area_planted, 2) if (area_planted > 0 and cce_yield > 0) else None
        insurance_per_acre = round(insurance_amount / area_planted, 2) if area_planted > 0 else 0.0

        # 2. Decision Logic
        # Outlined categories: "Potentially Eligible", "Manual Review Required", "Potentially Not Eligible"
        assessment = "Potentially Eligible"
        message = ""
        reasons: List[str] = []

        # A. Fatal / High-risk criteria -> Potentially Not Eligible
        if area_planted <= 0:
            assessment = "Potentially Not Eligible"
            message = "No cultivated planted area recorded for crop production."
            reasons.append("Planted area is zero, meaning no crop output can be generated to service a loan.")

        elif planted_area_ratio < 20.0:
            assessment = "Potentially Not Eligible"
            message = "Agricultural land utilization is below minimum operational viable threshold."
            reasons.append(
                f"Planted area utilization is very low ({planted_area_ratio:.1f}% of total {total_land} acres). "
                "Low active cultivation indicates under-utilized land or insufficient operational scale."
            )

        elif expected_yield <= 0:
            assessment = "Potentially Not Eligible"
            message = "Expected harvest yield is zero despite planted acreage."
            reasons.append("Zero anticipated crop yield indicates complete crop loss or invalid harvest projection.")

        elif cce_yield > 0 and yield_variation_percent is not None and yield_variation_percent < -60.0 and insurance_amount == 0:
            assessment = "Potentially Not Eligible"
            message = "Severe crop yield depression expected without insurance protection."
            reasons.append(
                f"Expected yield is {abs(yield_variation_percent):.1f}% below CCE benchmark, "
                "and zero crop insurance coverage exists to absorb the harvest deficit."
            )

        elif cce_yield > 0 and yield_variation_percent is not None and yield_variation_percent > 150.0:
            assessment = "Potentially Not Eligible"
            message = "Projected harvest significantly exceeds realistic agronomic capacity."
            reasons.append(
                f"Expected crop yield is {yield_variation_percent:+.1f}% above the Crop Cutting Experiment baseline. "
                "Such extreme deviation exceeds typical biological limits and suggests over-reported figures."
            )

        # B. Moderate-risk / Anomaly criteria -> Manual Review Required
        if assessment != "Potentially Not Eligible":
            review_reasons = []

            # Missing or zero CCE
            if cce_yield == 0:
                review_reasons.append(
                    "CCE reference yield is 0 or unavailable. Physical field verification or block-level "
                    "historical yield data is required."
                )

            # Significant yield deviation
            if yield_variation_percent is not None:
                if yield_variation_percent > 35.0:
                    review_reasons.append(
                        f"Expected yield is {yield_variation_percent:+.1f}% above CCE sample. Agronomic inspection "
                        "required to verify high-yielding inputs, hybrid seeds, or micro-irrigation."
                    )
                elif yield_variation_percent < -35.0:
                    review_reasons.append(
                        f"Expected yield is {abs(yield_variation_percent):.1f}% below CCE sample. Officer review required "
                        "to determine if projected revenue is sufficient for loan repayment."
                    )

            # Moderate land utilization (20% to 50%)
            if 20.0 <= planted_area_ratio < 50.0:
                review_reasons.append(
                    f"Moderate land utilization ({planted_area_ratio:.1f}%). Officer should verify whether remaining land "
                    "is fallow, rotated, or under secondary seasonal crops."
                )

            # Commercial high-cost crop without insurance
            if crop_type in ["Cotton", "Sugarcane"] and insurance_amount == 0:
                review_reasons.append(
                    f"{crop_type} is an input-intensive commercial crop. Absence of crop insurance (PMFBY) leaves the "
                    "farmer vulnerable to price and weather volatility."
                )

            # Non-standard crop
            if crop_type == "Other":
                review_reasons.append(
                    "Unspecified crop type selected. Officer must verify crop economics against local Scale of Finance."
                )

            if review_reasons:
                assessment = "Manual Review Required"
                message = "The available agricultural indicators require further verification by a credit officer."
                reasons.extend(review_reasons)

        # C. Low-risk criteria -> Potentially Eligible
        if assessment == "Potentially Eligible":
            message = "Agricultural indicators appear positive and consistent with standard productivity benchmarks."
            reasons.append(f"Healthy land utilization at {planted_area_ratio:.1f}% of total landholding.")
            if yield_variation_percent is not None:
                reasons.append(
                    f"Expected crop yield ({expected_yield:,.0f} kg) is aligned with the local CCE benchmark "
                    f"({cce_yield:,.0f} kg), showing an acceptable {yield_variation_percent:+.1f}% variance."
                )
            if insurance_amount > 0:
                reasons.append(
                    f"Crop insurance coverage of ₹{insurance_amount:,.0f} provides risk protection against crop damage."
                )
            else:
                reasons.append("Cultivated crop has stable agronomic indicators; crop insurance enrollment is recommended.")

        return {
            "success": True,
            "assessment": assessment,
            "message": message,
            "metrics": {
                "planted_area_ratio": planted_area_ratio,
                "yield_variation_percent": yield_variation_percent,
                "crop_insurance_amount": insurance_amount,
                "total_land_area": total_land,
                "area_planted": area_planted,
                "expected_crop_yield": expected_yield,
                "cce_crop_yield": cce_yield,
                "crop_type": crop_type,
                "expected_yield_per_acre": expected_yield_per_acre,
                "cce_yield_per_acre": cce_yield_per_acre,
                "insurance_per_acre": insurance_per_acre,
            },
            "reasons": reasons,
            "cce_assessment": {
                "cce_yield_recorded": cce_yield > 0,
                "cce_crop_yield_kg": cce_yield,
                "expected_crop_yield_kg": expected_yield,
                "yield_variation_percent": yield_variation_percent,
                "assessment_note": cce_assessment_note,
            },
            "assessment_type": "Transparent Preliminary Agronomic Assessment",
            "model_status": "Rule-based Agronomic Benchmark Engine (Extensible for future ML training)",
            "disclaimer": "This is a preliminary assessment, not a guarantee of loan approval. Actual loan approval requires verification of income, expenses, liabilities, repayment capacity, and the lender's policies.",
        }

eligibility_service = AgriculturalLoanEligibilityService()
