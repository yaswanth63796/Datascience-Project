"""
Inference Module for Agricultural Repayment Risk Model
Safely loads the fitted pipeline, validates inputs against the schema,
and produces explainable risk assessments with honest fallbacks when artifacts are missing.
"""
import os
import json
from typing import Dict, Any, List, Optional
import pandas as pd
import joblib

from feature_engineering import apply_feature_engineering, get_feature_schema

class AgriModelPredictor:
    def __init__(self, model_path: Optional[str] = None, schema_path: Optional[str] = None):
        basedir = os.path.abspath(os.path.dirname(__file__))
        artifacts_dir = os.path.abspath(os.path.join(basedir, "..", "artifacts"))
        
        self.model_path = model_path or os.path.join(artifacts_dir, "model.joblib")
        self.schema_path = schema_path or os.path.join(artifacts_dir, "feature_schema.json")
        self.metrics_path = os.path.join(artifacts_dir, "metrics.json")

        self.model = None
        self.schema = None
        self.metrics = None
        self._load_artifacts()

    def _load_artifacts(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
            except Exception as e:
                print(f"Warning: Failed to load model artifact at {self.model_path}: {e}")
                self.model = None

        if os.path.exists(self.schema_path):
            try:
                with open(self.schema_path, "r") as f:
                    self.schema = json.load(f)
            except Exception as e:
                print(f"Warning: Failed to load schema artifact: {e}")
                self.schema = get_feature_schema()
        else:
            self.schema = get_feature_schema()

        if os.path.exists(self.metrics_path):
            try:
                with open(self.metrics_path, "r") as f:
                    self.metrics = json.load(f)
            except Exception:
                self.metrics = None

    def predict_risk(
        self,
        farmer_data: Dict[str, Any],
        application_data: Dict[str, Any],
        crops_data: List[Dict[str, Any]],
        cashflow_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Runs ML prediction or provides graceful fallback.
        """
        # If model artifact is missing or corrupted, return transparent fallback
        if self.model is None:
            return {
                "predicted_risk_class": "MODERATE_RISK",
                "repayment_difficulty_probability": None,
                "model_version": "v1.0-unavailable",
                "model_name": "AgriCredit Risk Pipeline (Artifact Unavailable)",
                "is_fallback": True,
                "fallback_reason": "ML model artifact not found on disk. Credit assessment defaults to deterministic cash-flow analysis.",
                "key_contributing_factors": [
                    "Model artifact file was not located; fallback mode engaged.",
                    "Review deterministic cash-flow coverage indicators for assessment.",
                ],
                "limitations_disclaimer": "Automated ML scoring unavailable. System operated in manual-rule cash-flow mode.",
            }

        # Aggregate crops for model feature row
        primary_crop = "Paddy"
        primary_season = "Kharif"
        if crops_data and len(crops_data) > 0:
            primary_crop = crops_data[0].get("crop_name", "Paddy")
            primary_season = crops_data[0].get("season", "Kharif")

        row = {
            "total_landholding_acres": float(farmer_data.get("total_landholding_acres") or 0.0),
            "cultivated_land_current_season_acres": float(farmer_data.get("cultivated_land_current_season_acres") or 0.0),
            "farming_experience_years": int(farmer_data.get("farming_experience_years") or 1),
            "land_ownership": farmer_data.get("land_ownership", "owned"),
            "primary_crop": primary_crop,
            "primary_season": primary_season,
            "requested_loan_amount": float(application_data.get("requested_loan_amount") or 0.0),
            "requested_loan_tenure_months": int(application_data.get("requested_loan_tenure_months") or 12),
            "previous_loan_history": application_data.get("previous_loan_history", "clean"),
            "existing_outstanding_debt": float(application_data.get("existing_outstanding_debt") or 0.0),
            "other_verified_annual_income": float(application_data.get("other_verified_annual_income") or 0.0),
            "subsidy_received": float(application_data.get("subsidy_received") or 0.0),
            "total_seasonal_crop_revenue": float(cashflow_result.get("total_seasonal_crop_revenue") or 0.0),
            "total_seasonal_cultivation_cost": float(cashflow_result.get("total_seasonal_cultivation_cost") or 0.0),
            "estimated_crop_surplus": float(cashflow_result.get("estimated_agricultural_operating_surplus") or 0.0),
        }

        try:
            input_df = pd.DataFrame([row])
            feat_df = apply_feature_engineering(input_df)

            prob_array = self.model.predict_proba(feat_df)
            prob_distress = float(prob_array[0][1])

            # Calibrate risk category based on conservative thresholds
            if prob_distress < 0.35:
                risk_class = "LOW_RISK"
            elif prob_distress < 0.60:
                risk_class = "MODERATE_RISK"
            else:
                risk_class = "ELEVATED_RISK"

            # Derive contributing factors
            contributing_factors = []
            if feat_df["surplus_to_loan_ratio"].iloc[0] < 0.5:
                contributing_factors.append("Low agricultural surplus relative to requested loan principal.")
            else:
                contributing_factors.append("Healthy estimated seasonal crop surplus relative to loan size.")

            if feat_df["debt_to_annual_income_ratio"].iloc[0] > 0.8:
                contributing_factors.append("High existing debt burden relative to estimated farm turnover.")

            if row["previous_loan_history"] in ["defaulted", "minor_delay"]:
                contributing_factors.append(f"Prior agricultural credit history recorded as '{row['previous_loan_history']}'.")

            if row["land_ownership"] == "owned" and row["farming_experience_years"] >= 10:
                contributing_factors.append(f"Significant agricultural experience ({row['farming_experience_years']} yrs) on owned landholding.")

            model_version = self.metrics.get("model_version", "v1.0-synthetic-rf") if self.metrics else "v1.0-synthetic-rf"

            return {
                "predicted_risk_class": risk_class,
                "repayment_difficulty_probability": round(prob_distress, 4),
                "model_version": model_version,
                "model_name": "AgriCredit Agricultural Repayment Risk Random Forest",
                "is_fallback": False,
                "fallback_reason": None,
                "key_contributing_factors": contributing_factors,
                "limitations_disclaimer": (
                    "ML risk estimate trained on documented agricultural economics synthetic dataset due to banking privacy laws. "
                    "Output is an indicative risk score and must be corroborated by field inspection and human review."
                ),
            }

        except Exception as e:
            return {
                "predicted_risk_class": "MODERATE_RISK",
                "repayment_difficulty_probability": None,
                "model_version": "v1.0-error",
                "model_name": "AgriCredit Risk Pipeline",
                "is_fallback": True,
                "fallback_reason": f"Prediction feature transform error: {str(e)}",
                "key_contributing_factors": [
                    "Input validation mismatch during feature transformation.",
                    "Falling back to transparent agricultural cash-flow analysis.",
                ],
                "limitations_disclaimer": "ML scoring encountered an input mismatch. Deterministic cashflow indicators should be prioritized.",
            }
