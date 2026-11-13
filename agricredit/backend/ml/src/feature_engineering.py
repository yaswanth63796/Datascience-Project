"""
Feature Engineering and Preprocessing Pipeline
Defines raw feature expectations, engineered ratios, and ColumnTransformer pipeline.
"""
from typing import Tuple, List, Dict, Any
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

NUMERICAL_RAW_FEATURES = [
    "total_landholding_acres",
    "cultivated_land_current_season_acres",
    "farming_experience_years",
    "requested_loan_amount",
    "requested_loan_tenure_months",
    "existing_outstanding_debt",
    "other_verified_annual_income",
    "subsidy_received",
    "total_seasonal_crop_revenue",
    "total_seasonal_cultivation_cost",
    "estimated_crop_surplus",
]

CATEGORICAL_FEATURES = [
    "land_ownership",
    "primary_crop",
    "primary_season",
    "previous_loan_history",
]

ENGINEERED_FEATURES = [
    "surplus_to_loan_ratio",
    "debt_to_annual_income_ratio",
    "cultivated_ratio",
    "cost_to_revenue_ratio",
    "subsidy_share_of_cost",
]

ALL_NUMERICAL_FEATURES = NUMERICAL_RAW_FEATURES + ENGINEERED_FEATURES

def apply_feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes agricultural financial health ratios.
    """
    data = df.copy()

    # Ensure all numerical raw columns are numeric and fill missing with appropriate medians/zeros
    for col in NUMERICAL_RAW_FEATURES:
        if col not in data.columns:
            data[col] = 0.0
        data[col] = pd.to_numeric(data[col], errors="coerce").fillna(0.0)

    for col in CATEGORICAL_FEATURES:
        if col not in data.columns:
            data[col] = "unknown"
        data[col] = data[col].fillna("unknown").astype(str)

    # 1. Surplus to requested loan ratio
    data["surplus_to_loan_ratio"] = (
        data["estimated_crop_surplus"] / (data["requested_loan_amount"] + 1.0)
    ).clip(-5.0, 10.0)

    # 2. Total debt to annual income ratio
    annual_farm_turnover = data["total_seasonal_crop_revenue"] * 2.0
    total_annual_income = annual_farm_turnover + data["other_verified_annual_income"] + 1.0
    total_debt_burden = data["existing_outstanding_debt"] + data["requested_loan_amount"]
    data["debt_to_annual_income_ratio"] = (total_debt_burden / total_annual_income).clip(0.0, 15.0)

    # 3. Cultivated land to total landholding ratio
    data["cultivated_ratio"] = (
        data["cultivated_land_current_season_acres"] / (data["total_landholding_acres"] + 0.1)
    ).clip(0.0, 2.0)

    # 4. Input cost intensity (Cost to revenue ratio)
    data["cost_to_revenue_ratio"] = (
        data["total_seasonal_cultivation_cost"] / (data["total_seasonal_crop_revenue"] + 1.0)
    ).clip(0.0, 10.0)

    # 5. Subsidy safety net share
    data["subsidy_share_of_cost"] = (
        data["subsidy_received"] / (data["total_seasonal_cultivation_cost"] + 1.0)
    ).clip(0.0, 2.0)

    return data

def build_preprocessor() -> ColumnTransformer:
    """
    Constructs scikit-learn ColumnTransformer for numerical scaling and categorical one-hot encoding.
    """
    num_pipeline = StandardScaler()
    cat_pipeline = OneHotEncoder(handle_unknown="ignore", sparse_output=False)

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, ALL_NUMERICAL_FEATURES),
            ("cat", cat_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )
    return preprocessor

def get_feature_schema() -> Dict[str, Any]:
    return {
        "numerical_raw_features": NUMERICAL_RAW_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "engineered_features": ENGINEERED_FEATURES,
        "all_numerical_features": ALL_NUMERICAL_FEATURES,
        "target": "repayment_difficulty",
        "positive_class": 1,
        "negative_class": 0,
        "description": "Agricultural loan repayment risk feature schema based on seasonal farm economics and debt obligations.",
    }
