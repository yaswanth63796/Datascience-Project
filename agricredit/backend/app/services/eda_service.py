"""
AgriCredit Exploratory Data Analysis (EDA) Service
Calculates real-time agronomic and financial analytics, statistical distributions,
correlation matrices, outlier exploration, and missing-value summaries.
Supports both the 3,000-record empirical agricultural benchmark dataset and
live database applications.
"""
import os
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from flask import current_app

from app.models.application import LoanApplication
from app.models.farmer import Farmer
from app.models.crop_detail import CropDetail


# Column label dictionary for human-readable presentation
FEATURE_LABELS = {
    "total_landholding_acres": "Total Landholding (Acres)",
    "cultivated_land_current_season_acres": "Cultivated Land (Acres)",
    "cultivated_area_acres": "Cultivated Area (Acres)",
    "farming_experience_years": "Farming Experience (Years)",
    "requested_loan_amount": "Requested Loan (₹)",
    "requested_loan_tenure_months": "Loan Tenure (Months)",
    "existing_outstanding_debt": "Outstanding Debt (₹)",
    "other_verified_annual_income": "Other Verified Income (₹)",
    "subsidy_received": "Subsidy Received (₹)",
    "total_seasonal_crop_revenue": "Seasonal Crop Revenue (₹)",
    "total_seasonal_cultivation_cost": "Cultivation Expenses (₹)",
    "estimated_crop_surplus": "Estimated Crop Surplus (₹)",
    "expected_yield_per_acre": "Expected Yield (Quintals/Acre)",
    "expected_price_per_yield_unit": "Market Price (₹/Quintal)",
    "repayment_difficulty": "Repayment Distress Risk (0/1)",
}


class EdaService:
    @staticmethod
    def get_dataset_path() -> str:
        backend_dir = os.path.abspath(os.path.join(current_app.root_path, ".."))
        processed = os.path.join(backend_dir, "ml", "data", "processed", "agricultural_loans.csv")
        if os.path.exists(processed):
            return processed
        synthetic = os.path.join(backend_dir, "ml", "data", "synthetic", "synthetic_agri_loans.csv")
        if os.path.exists(synthetic):
            return synthetic
        return processed

    @classmethod
    def load_data(
        cls,
        source: str = "benchmark",
        crop: Optional[str] = None,
        season: Optional[str] = None,
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Loads dataset from either CSV benchmark or live SQL database,
        maps column variations, and applies optional crop and season filters.
        """
        meta = {
            "source": source,
            "is_synthetic": True if source == "benchmark" else False,
            "dataset_name": (
                "AgriCredit Agricultural Loan Benchmark Dataset (3,000 Records)"
                if source == "benchmark"
                else "AgriCredit Live Application Database Records"
            ),
            "applied_filters": {
                "crop": crop if crop and crop != "all" else None,
                "season": season if season and season != "all" else None,
            },
        }

        if source == "database":
            df = cls._load_from_database()
            meta["is_synthetic"] = False
        else:
            path = cls.get_dataset_path()
            if not os.path.exists(path):
                # Attempt to generate if missing
                try:
                    from ml.src.prepare_dataset import main as prep_main
                    prep_main()
                except Exception:
                    pass

            if not os.path.exists(path):
                return pd.DataFrame(), {**meta, "error": "Benchmark dataset file not found."}

            df = pd.read_csv(path)

        # Standardize column naming if necessary
        col_mappings = {
            "crop": "primary_crop",
            "crops": "primary_crop",
            "crop_name": "primary_crop",
            "season": "primary_season",
            "yield": "expected_yield_per_acre",
            "crop_yield": "expected_yield_per_acre",
            "yield_per_acre": "expected_yield_per_acre",
            "cultivated_acres": "cultivated_land_current_season_acres",
            "cultivated_area": "cultivated_land_current_season_acres",
            "loan_amount": "requested_loan_amount",
        }
        for old_col, new_col in col_mappings.items():
            if old_col in df.columns and new_col not in df.columns:
                df[new_col] = df[old_col]

        meta["total_unfiltered_records"] = len(df)

        # Apply filters safely
        if crop and crop != "all" and "primary_crop" in df.columns:
            df = df[df["primary_crop"].astype(str).str.strip().str.lower() == crop.strip().lower()]

        if season and season != "all" and "primary_season" in df.columns:
            df = df[df["primary_season"].astype(str).str.strip().str.lower() == season.strip().lower()]

        meta["filtered_records"] = len(df)
        return df, meta

    @classmethod
    def _load_from_database(cls) -> pd.DataFrame:
        """
        Extracts loan applications joined with farmer and crop details.
        """
        records = []
        apps = LoanApplication.query.all()
        for app in apps:
            farmer = Farmer.query.get(app.farmer_id)
            crops = CropDetail.query.filter_by(application_id=app.id).all()
            
            primary_crop_name = crops[0].crop_name if crops else "Unspecified"
            primary_season_name = crops[0].season if crops else "Unspecified"
            total_cult_area = sum([float(c.cultivated_area_acres or 0.0) for c in crops])
            total_rev = sum([c.gross_revenue for c in crops])
            total_cost = sum([c.total_cultivation_cost for c in crops])
            total_surplus = sum([c.estimated_crop_surplus for c in crops])
            avg_yield = (
                float(np.mean([float(c.expected_yield_per_acre or 0.0) for c in crops]))
                if crops
                else 0.0
            )

            # Determine eligibility outcome
            repayment_diff = 1 if "REJECTED" in (app.status or "").upper() else 0

            records.append({
                "application_id": app.id,
                "application_number": app.application_number,
                "total_landholding_acres": float(farmer.total_landholding_acres or 0.0) if farmer else 0.0,
                "cultivated_land_current_season_acres": total_cult_area or (float(farmer.cultivated_land_current_season_acres or 0.0) if farmer else 0.0),
                "farming_experience_years": int(farmer.farming_experience_years or 0) if farmer else 0,
                "land_ownership": farmer.land_ownership if farmer else "unknown",
                "primary_crop": primary_crop_name,
                "primary_season": primary_season_name,
                "requested_loan_amount": float(app.requested_loan_amount or 0.0),
                "requested_loan_tenure_months": int(app.requested_loan_tenure_months or 12),
                "previous_loan_history": app.previous_loan_history or "first_time_borrower",
                "existing_outstanding_debt": float(app.existing_outstanding_debt or 0.0),
                "other_verified_annual_income": float(app.other_verified_annual_income or 0.0),
                "subsidy_received": float(app.subsidy_received or 0.0),
                "total_seasonal_crop_revenue": float(total_rev),
                "total_seasonal_cultivation_cost": float(total_cost),
                "estimated_crop_surplus": float(total_surplus),
                "expected_yield_per_acre": avg_yield,
                "repayment_difficulty": repayment_diff,
                "status": app.status,
            })

        return pd.DataFrame(records)

    # -------------------------------------------------------------
    # Overview Summary
    # -------------------------------------------------------------
    @classmethod
    def get_overview(
        cls,
        source: str = "benchmark",
        crop: Optional[str] = None,
        season: Optional[str] = None,
    ) -> Dict[str, Any]:
        df, meta = cls.load_data(source, crop, season)

        if df.empty:
            return {
                "meta": meta,
                "total_applications": 0,
                "total_crops": 0,
                "avg_loan_amount": 0.0,
                "avg_cultivated_area": 0.0,
                "avg_expected_yield": None,
                "yield_unit": "Quintals/Acre",
                "yield_available": False,
                "missing_values_count": 0,
                "outliers_count": 0,
                "outliers_percentage": 0.0,
                "eligibility_summary": {},
            }

        total_apps = int(len(df))
        total_crops = int(df["primary_crop"].nunique()) if "primary_crop" in df.columns else 0

        avg_loan = (
            round(float(df["requested_loan_amount"].mean()), 2)
            if "requested_loan_amount" in df.columns
            else 0.0
        )
        avg_land = (
            round(float(df["cultivated_land_current_season_acres"].mean()), 2)
            if "cultivated_land_current_season_acres" in df.columns
            else 0.0
        )

        # Expected yield checking
        has_yield = "expected_yield_per_acre" in df.columns
        avg_yield = None
        if has_yield and not df["expected_yield_per_acre"].isna().all():
            avg_yield = round(float(df["expected_yield_per_acre"].dropna().mean()), 2)

        # Missing values
        missing_count = int(df.isna().sum().sum())

        # Outlier calculation across key financial variables using IQR
        outlier_rows = set()
        key_num_cols = [
            col for col in [
                "requested_loan_amount",
                "cultivated_land_current_season_acres",
                "total_seasonal_crop_revenue",
                "total_seasonal_cultivation_cost",
                "existing_outstanding_debt",
            ]
            if col in df.columns
        ]

        for col in key_num_cols:
            series = df[col].dropna()
            if len(series) > 4:
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                if iqr > 0:
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    outlier_indices = df[(df[col] < lower_bound) | (df[col] > upper_bound)].index
                    outlier_rows.update(outlier_indices)

        outlier_count = len(outlier_rows)
        outlier_pct = round((outlier_count / total_apps * 100.0), 2) if total_apps > 0 else 0.0

        # Eligibility / Repayment Risk
        eligibility = {}
        if "repayment_difficulty" in df.columns:
            counts = df["repayment_difficulty"].value_counts().to_dict()
            low_risk = int(counts.get(0, 0))
            high_risk = int(counts.get(1, 0))
            eligibility = {
                "low_risk_count": low_risk,
                "high_risk_count": high_risk,
                "low_risk_rate": round(low_risk / total_apps * 100.0, 1) if total_apps else 0.0,
                "distress_rate": round(high_risk / total_apps * 100.0, 1) if total_apps else 0.0,
            }

        return {
            "meta": meta,
            "total_applications": total_apps,
            "total_crops": total_crops,
            "avg_loan_amount": avg_loan,
            "avg_cultivated_area": avg_land,
            "avg_expected_yield": avg_yield,
            "yield_unit": "Quintals/Acre",
            "yield_available": has_yield and avg_yield is not None,
            "missing_values_count": missing_count,
            "outliers_count": outlier_count,
            "outliers_percentage": outlier_pct,
            "eligibility_summary": eligibility,
        }

    # -------------------------------------------------------------
    # Distributions & Chart Data
    # -------------------------------------------------------------
    @classmethod
    def get_distributions(
        cls,
        source: str = "benchmark",
        crop: Optional[str] = None,
        season: Optional[str] = None,
    ) -> Dict[str, Any]:
        df, meta = cls.load_data(source, crop, season)

        if df.empty:
            return {"meta": meta, "error": "No data matching selection."}

        total_records = len(df)

        # 1. Crop Type Distribution
        crop_distribution = []
        if "primary_crop" in df.columns:
            crop_counts = df["primary_crop"].value_counts()
            for c_name, count in crop_counts.items():
                crop_distribution.append({
                    "crop": str(c_name),
                    "count": int(count),
                    "percentage": round(int(count) / total_records * 100.0, 1),
                })

        # 2. Requested Loan Amount Histogram
        loan_hist = cls._compute_histogram(
            df=df,
            col="requested_loan_amount",
            bins_count=10,
            format_currency=True,
            unit="₹",
        )

        # 3. Cultivated Land Area Histogram
        land_hist = cls._compute_histogram(
            df=df,
            col="cultivated_land_current_season_acres",
            bins_count=10,
            unit="Acres",
        )

        # 4. Expected Crop Yield Histogram
        yield_hist = {
            "available": False,
            "explanation": "Expected crop yield is not present in the current dataset view.",
            "unit": "Quintals/Acre",
            "bins": [],
        }
        if "expected_yield_per_acre" in df.columns and not df["expected_yield_per_acre"].isna().all():
            yield_bins = cls._compute_histogram(
                df=df,
                col="expected_yield_per_acre",
                bins_count=10,
                unit="Quintal/Acre",
            )
            yield_hist = {
                "available": True,
                "explanation": "Yield recorded in Quintals per cultivated acre.",
                "unit": "Quintals/Acre",
                "bins": yield_bins.get("bins", []),
            }

        # 5. Crop-wise Average Loan Amount
        crop_loan = []
        if "primary_crop" in df.columns and "requested_loan_amount" in df.columns:
            grouped = df.groupby("primary_crop")["requested_loan_amount"].agg(
                ["mean", "median", "min", "max", "count"]
            ).reset_index()
            for _, row in grouped.iterrows():
                crop_loan.append({
                    "crop": str(row["primary_crop"]),
                    "avg_loan": round(float(row["mean"]), 2),
                    "median_loan": round(float(row["median"]), 2),
                    "min_loan": round(float(row["min"]), 2),
                    "max_loan": round(float(row["max"]), 2),
                    "count": int(row["count"]),
                })
            crop_loan.sort(key=lambda x: x["avg_loan"], reverse=True)

        # 6. Loan Amount vs Cultivated Area Scatter Plot
        scatter_points = []
        if (
            "cultivated_land_current_season_acres" in df.columns
            and "requested_loan_amount" in df.columns
        ):
            # If dataset is very large, sample 200 points for crisp frontend rendering
            scatter_df = df
            if len(df) > 220:
                scatter_df = df.sample(n=220, random_state=42)

            for idx, row in scatter_df.iterrows():
                scatter_points.append({
                    "id": int(idx),
                    "cultivated_area": round(float(row["cultivated_land_current_season_acres"]), 2),
                    "loan_amount": round(float(row["requested_loan_amount"]), 2),
                    "crop": str(row.get("primary_crop", "Other")),
                    "season": str(row.get("primary_season", "All")),
                    "risk_flag": int(row.get("repayment_difficulty", 0)),
                })

        # 7. Crop-wise Revenue or Yield Comparison (Grouped Bar Chart)
        crop_comparison = []
        if "primary_crop" in df.columns:
            has_rev = "total_seasonal_crop_revenue" in df.columns
            has_cost = "total_seasonal_cultivation_cost" in df.columns
            has_surp = "estimated_crop_surplus" in df.columns
            has_yd = "expected_yield_per_acre" in df.columns

            grouped = df.groupby("primary_crop")
            for c_name, group in grouped:
                entry = {
                    "crop": str(c_name),
                    "count": int(len(group)),
                    "avg_revenue": round(float(group["total_seasonal_crop_revenue"].mean()), 2) if has_rev else 0.0,
                    "avg_cost": round(float(group["total_seasonal_cultivation_cost"].mean()), 2) if has_cost else 0.0,
                    "avg_surplus": round(float(group["estimated_crop_surplus"].mean()), 2) if has_surp else 0.0,
                    "avg_yield": round(float(group["expected_yield_per_acre"].mean()), 2) if has_yd else 0.0,
                    "yield_available": has_yd,
                }
                crop_comparison.append(entry)

        # 8. Loan Eligibility / Risk Distribution
        eligibility_distribution = []
        if "repayment_difficulty" in df.columns:
            vc = df["repayment_difficulty"].value_counts()
            low_risk_cnt = int(vc.get(0, 0))
            high_risk_cnt = int(vc.get(1, 0))
            eligibility_distribution = [
                {
                    "label": "Low Risk / Likely Approved",
                    "category": "Low Risk",
                    "value": low_risk_cnt,
                    "percentage": round(low_risk_cnt / total_records * 100.0, 1) if total_records else 0,
                    "color": "#2d6a4f",
                },
                {
                    "label": "Elevated Risk / Distress Caution",
                    "category": "High Risk",
                    "value": high_risk_cnt,
                    "percentage": round(high_risk_cnt / total_records * 100.0, 1) if total_records else 0,
                    "color": "#e76f51",
                },
            ]
        elif "primary_season" in df.columns:
            # Fallback if no repayment label
            vc = df["primary_season"].value_counts()
            colors = ["#2d6a4f", "#e9c46a", "#52b788", "#f4a261"]
            for i, (s_name, count) in enumerate(vc.items()):
                eligibility_distribution.append({
                    "label": f"Season: {s_name}",
                    "category": str(s_name),
                    "value": int(count),
                    "percentage": round(int(count) / total_records * 100.0, 1),
                    "color": colors[i % len(colors)],
                })

        return {
            "meta": meta,
            "crop_distribution": crop_distribution,
            "loan_amount_distribution": loan_hist,
            "cultivated_area_distribution": land_hist,
            "expected_yield_distribution": yield_hist,
            "crop_wise_loan_amount": crop_loan,
            "loan_vs_cultivated_area": scatter_points,
            "crop_wise_revenue_or_yield": crop_comparison,
            "eligibility_distribution": eligibility_distribution,
        }

    # -------------------------------------------------------------
    # Correlation Heatmap
    # -------------------------------------------------------------
    @classmethod
    def get_correlation(
        cls,
        source: str = "benchmark",
        crop: Optional[str] = None,
        season: Optional[str] = None,
    ) -> Dict[str, Any]:
        df, meta = cls.load_data(source, crop, season)

        candidate_cols = [
            "cultivated_land_current_season_acres",
            "total_landholding_acres",
            "farming_experience_years",
            "requested_loan_amount",
            "requested_loan_tenure_months",
            "existing_outstanding_debt",
            "other_verified_annual_income",
            "subsidy_received",
            "total_seasonal_crop_revenue",
            "total_seasonal_cultivation_cost",
            "estimated_crop_surplus",
            "expected_yield_per_acre",
            "repayment_difficulty",
        ]

        # Keep only available numeric columns with variation
        available_cols = []
        for col in candidate_cols:
            if col in df.columns:
                series = pd.to_numeric(df[col], errors="coerce").dropna()
                if len(series) > 1 and series.std() > 0:
                    available_cols.append(col)

        if len(available_cols) < 2:
            return {
                "meta": meta,
                "features": [],
                "labels": {},
                "matrix": {},
                "pairs": [],
                "error": "Insufficient numerical variables with variation to compute correlation.",
            }

        corr_df = df[available_cols].apply(pd.to_numeric, errors="coerce").corr().round(3)

        # Build feature label mappings
        features_meta = [
            {
                "id": col,
                "label": FEATURE_LABELS.get(col, col.replace("_", " ").title()),
            }
            for col in available_cols
        ]

        matrix_dict = {}
        pairs_list = []
        for i, row_col in enumerate(available_cols):
            matrix_dict[row_col] = {}
            for j, col_col in enumerate(available_cols):
                val = float(corr_df.loc[row_col, col_col])
                if np.isnan(val):
                    val = 0.0
                matrix_dict[row_col][col_col] = val
                pairs_list.append({
                    "x": col_col,
                    "y": row_col,
                    "label_x": FEATURE_LABELS.get(col_col, col_col),
                    "label_y": FEATURE_LABELS.get(row_col, row_col),
                    "correlation": val,
                })

        return {
            "meta": meta,
            "features": features_meta,
            "matrix": matrix_dict,
            "pairs": pairs_list,
        }

    # -------------------------------------------------------------
    # Missing Values Analysis
    # -------------------------------------------------------------
    @classmethod
    def get_missing_values(cls, source: str = "benchmark") -> Dict[str, Any]:
        df, meta = cls.load_data(source=source)
        total_rows = len(df)
        total_cells = int(df.size)
        total_missing = int(df.isna().sum().sum())

        columns_summary = []
        for col in df.columns:
            m_count = int(df[col].isna().sum())
            m_pct = round(m_count / total_rows * 100.0, 2) if total_rows > 0 else 0.0
            non_missing = total_rows - m_count
            dtype_str = str(df[col].dtype)

            columns_summary.append({
                "column": col,
                "display_name": FEATURE_LABELS.get(col, col.replace("_", " ").title()),
                "data_type": dtype_str,
                "missing_count": m_count,
                "missing_percentage": m_pct,
                "non_missing_count": non_missing,
                "is_complete": m_count == 0,
            })

        # Sort columns with highest missing counts first
        columns_summary.sort(key=lambda x: x["missing_count"], reverse=True)

        return {
            "meta": meta,
            "total_rows": total_rows,
            "total_cells": total_cells,
            "total_missing": total_missing,
            "overall_missing_percentage": round(total_missing / total_cells * 100.0, 2) if total_cells else 0.0,
            "columns": columns_summary,
        }

    # -------------------------------------------------------------
    # Numerical Statistical Summary Table (with IQR Outliers)
    # -------------------------------------------------------------
    @classmethod
    def get_numerical_summary(
        cls,
        source: str = "benchmark",
        crop: Optional[str] = None,
        season: Optional[str] = None,
    ) -> Dict[str, Any]:
        df, meta = cls.load_data(source, crop, season)

        candidate_cols = [
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
            "expected_yield_per_acre",
        ]

        summary_rows = []
        for col in candidate_cols:
            if col not in df.columns:
                continue

            s = pd.to_numeric(df[col], errors="coerce").dropna()
            if s.empty:
                continue

            q1 = float(s.quantile(0.25))
            q3 = float(s.quantile(0.75))
            iqr = float(q3 - q1)
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers = s[(s < lower_bound) | (s > upper_bound)]
            outlier_cnt = len(outliers)
            outlier_pct = round(outlier_cnt / len(s) * 100.0, 2)

            summary_rows.append({
                "feature": col,
                "label": FEATURE_LABELS.get(col, col.replace("_", " ").title()),
                "count": int(len(s)),
                "mean": round(float(s.mean()), 2),
                "std": round(float(s.std()), 2) if len(s) > 1 else 0.0,
                "median": round(float(s.median()), 2),
                "min": round(float(s.min()), 2),
                "q25": round(q1, 2),
                "q75": round(q3, 2),
                "max": round(float(s.max()), 2),
                "iqr": round(iqr, 2),
                "outlier_count": outlier_cnt,
                "outlier_percentage": outlier_pct,
            })

        return {
            "meta": meta,
            "rows": summary_rows,
        }

    # -------------------------------------------------------------
    # Filter Options
    # -------------------------------------------------------------
    @classmethod
    def get_filters(cls, source: str = "benchmark") -> Dict[str, Any]:
        df, _ = cls.load_data(source=source)
        crops = []
        seasons = []

        if not df.empty:
            if "primary_crop" in df.columns:
                crops = sorted([str(x) for x in df["primary_crop"].dropna().unique().tolist()])
            if "primary_season" in df.columns:
                seasons = sorted([str(x) for x in df["primary_season"].dropna().unique().tolist()])

        db_count = LoanApplication.query.count()
        path = cls.get_dataset_path()
        benchmark_count = 3000
        if os.path.exists(path):
            try:
                # count lines quickly
                with open(path) as f:
                    benchmark_count = sum(1 for _ in f) - 1
            except Exception:
                pass

        return {
            "crops": crops,
            "seasons": seasons,
            "data_sources": [
                {
                    "id": "benchmark",
                    "name": "Agricultural Loans Benchmark Dataset (CSV)",
                    "record_count": benchmark_count,
                    "description": "Synthesized according to Indian Ministry of Agriculture & NABARD agro-economic scales of finance",
                },
                {
                    "id": "database",
                    "name": "Live Bank Loan Applications (AgriCredit DB)",
                    "record_count": db_count,
                    "description": "Real application submissions entered into AgriCredit credit appraisal system",
                },
            ],
        }

    # -------------------------------------------------------------
    # Helper: Histogram Binning
    # -------------------------------------------------------------
    @staticmethod
    def _compute_histogram(
        df: pd.DataFrame,
        col: str,
        bins_count: int = 10,
        format_currency: bool = False,
        unit: str = "",
    ) -> Dict[str, Any]:
        if col not in df.columns:
            return {"bins": [], "min": 0, "max": 0, "count": 0}

        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if series.empty:
            return {"bins": [], "min": 0, "max": 0, "count": 0}

        min_val = float(series.min())
        max_val = float(series.max())

        # If constant series
        if min_val == max_val:
            label = f"{min_val:,.0f} {unit}".strip()
            return {
                "bins": [{"bin_label": label, "bin_min": min_val, "bin_max": max_val, "count": len(series)}],
                "min": min_val,
                "max": max_val,
                "count": len(series),
            }

        counts, bin_edges = np.histogram(series, bins=bins_count)
        bins = []
        for i in range(len(counts)):
            b_min = float(bin_edges[i])
            b_max = float(bin_edges[i + 1])
            cnt = int(counts[i])

            if format_currency:
                if b_max >= 100000:
                    lbl = f"₹{b_min/100000:.1f}L - ₹{b_max/100000:.1f}L"
                else:
                    lbl = f"₹{b_min/1000:.0f}K - ₹{b_max/1000:.0f}K"
            else:
                if max_val > 10:
                    lbl = f"{b_min:.1f} - {b_max:.1f} {unit}".strip()
                else:
                    lbl = f"{b_min:.2f} - {b_max:.2f} {unit}".strip()

            bins.append({
                "bin_label": lbl,
                "bin_min": round(b_min, 2),
                "bin_max": round(b_max, 2),
                "count": cnt,
            })

        return {
            "bins": bins,
            "min": round(min_val, 2),
            "max": round(max_val, 2),
            "count": len(series),
            "unit": unit,
        }
