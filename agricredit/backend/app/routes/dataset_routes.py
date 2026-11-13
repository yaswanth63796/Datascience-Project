"""
Dataset and Model Transparency Routes
Endpoints: /api/dataset/info, /api/model/info
"""
import os
import json
import pandas as pd
from flask import Blueprint, jsonify, current_app

dataset_bp = Blueprint("dataset_bp", __name__)

@dataset_bp.route("/dataset/info", methods=["GET"])
def get_dataset_info():
    backend_dir = os.path.abspath(os.path.join(current_app.root_path, ".."))
    processed_path = os.path.join(backend_dir, "ml", "data", "processed", "agricultural_loans.csv")
    metrics_path = current_app.config["METRICS_PATH"]
    schema_path = current_app.config["SCHEMA_PATH"]

    dataset_summary = {
        "dataset_name": "AgriCredit Agricultural Loan Repayment Benchmark Dataset",
        "provenance_type": "Empirically Grounded Agricultural Economics Synthetic Dataset",
        "is_synthetic": True,
        "primary_source": "Synthesized according to Indian Ministry of Agriculture & NABARD agro-economic scales of finance and KCC norms",
        "public_data_restrictions_explanation": (
            "Individual farmer loan NPA and repayment default account records are strictly restricted under "
            "RBI borrower privacy directives and banking secrecy statutes in India. Public repositories such as data.gov.in "
            "provide macro-level state credit statistics rather than granular loan-level records. Consequently, this dataset was "
            "modeled with realistic agronomic ratios to maintain complete transparency and eliminate hidden data fabrication."
        ),
        "target_definition": {
            "name": "repayment_difficulty",
            "type": "Binary Classification (0 = Timely Repayment / Low Risk, 1 = Repayment Distress / Elevated Risk)",
            "prediction_horizon": "12-month agricultural crop loan season",
        },
        "sample_count": 0,
        "features_count": 0,
        "class_distribution": {},
        "summary_statistics": {},
    }

    if os.path.exists(processed_path):
        try:
            df = pd.read_csv(processed_path)
            dataset_summary["sample_count"] = len(df)
            dataset_summary["features_count"] = df.shape[1]
            if "repayment_difficulty" in df.columns:
                counts = df["repayment_difficulty"].value_counts().to_dict()
                dataset_summary["class_distribution"] = {
                    "Low Risk (0)": int(counts.get(0, 0)),
                    "Repayment Distress (1)": int(counts.get(1, 0)),
                    "Distress Rate": f"{df['repayment_difficulty'].mean():.2%}",
                }
            
            num_cols = ["total_landholding_acres", "cultivated_land_current_season_acres", "requested_loan_amount", "total_seasonal_crop_revenue", "estimated_crop_surplus"]
            stats = df[num_cols].describe().round(2).to_dict()
            dataset_summary["summary_statistics"] = stats
        except Exception as e:
            dataset_summary["read_error"] = str(e)

    if os.path.exists(schema_path):
        try:
            with open(schema_path, "r") as f:
                dataset_summary["feature_schema"] = json.load(f)
        except Exception:
            pass

    return jsonify({"dataset_info": dataset_summary}), 200

@dataset_bp.route("/model/info", methods=["GET"])
def get_model_info():
    metrics_path = current_app.config["METRICS_PATH"]
    model_path = current_app.config["MODEL_PATH"]
    schema_path = current_app.config["SCHEMA_PATH"]

    model_info = {
        "model_name": "AgriCredit Repayment Risk Classifier",
        "algorithm": "Random Forest Classifier (100 estimators, max depth 8, balanced class weights)",
        "baseline_algorithm": "Logistic Regression (Standardized, balanced class weights)",
        "model_file_exists": os.path.exists(model_path),
        "model_version": "v1.0-synthetic-rf",
        "status": "OPERATIONAL" if os.path.exists(model_path) else "NOT_TRAINED",
        "evaluation_metrics": None,
        "feature_importances": [],
        "limitations": [
            "Trained on an empirically calibrated synthetic dataset due to banking privacy laws.",
            "Output is an indicative risk class, NOT an official bank sanction or rejection.",
            "Must be combined with field inspection, land record verification, and loan officer review.",
            "Does not account for uninsurable catastrophe events or sudden global commodity price shocks.",
        ],
    }

    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as f:
                data = json.load(f)
                model_info["training_date"] = data.get("training_date")
                model_info["dataset_provenance"] = data.get("dataset_provenance")
                model_info["baseline_model"] = data.get("baseline_model")
                model_info["candidate_model"] = data.get("candidate_model")
                model_info["feature_importances"] = data.get("feature_importances", [])
                model_info["model_version"] = data.get("model_version", "v1.0-synthetic-rf")
        except Exception as e:
            model_info["metrics_read_error"] = str(e)

    return jsonify({"model_info": model_info}), 200
