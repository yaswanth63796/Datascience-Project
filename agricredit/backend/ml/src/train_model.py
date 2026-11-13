"""
Model Training Script
Trains Baseline (Logistic Regression) vs Candidate (Random Forest),
runs Stratified Cross-Validation, logs metrics, extracts feature importances,
and serializes artifacts.
"""
import os
import json
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)

from feature_engineering import (
    apply_feature_engineering,
    build_preprocessor,
    get_feature_schema,
    ALL_NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
)

def train_and_evaluate():
    basedir = os.path.abspath(os.path.dirname(__file__))
    data_path = os.path.abspath(os.path.join(basedir, "..", "data", "processed", "agricultural_loans.csv"))
    artifacts_dir = os.path.abspath(os.path.join(basedir, "..", "artifacts"))
    os.makedirs(artifacts_dir, exist_ok=True)

    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Running prepare_dataset first...")
        from prepare_dataset import main as prep_main
        prep_main()

    print(f"Loading dataset from {data_path}...")
    raw_df = pd.read_csv(data_path)
    df = apply_feature_engineering(raw_df)

    y = df["repayment_difficulty"].values
    X = df.drop(columns=["repayment_difficulty"])

    print(f"Dataset Shape: {X.shape}, Target Positive Rate: {np.mean(y):.2%}")

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    # 1. Baseline Model: Logistic Regression
    print("\n--- Training Baseline Model: Logistic Regression ---")
    baseline_pipe = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
        ]
    )

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_baseline = cross_validate(
        baseline_pipe,
        X_train,
        y_train,
        cv=skf,
        scoring=["accuracy", "precision", "recall", "f1", "roc_auc"],
    )

    baseline_pipe.fit(X_train, y_train)
    y_pred_base = baseline_pipe.predict(X_test)
    y_proba_base = baseline_pipe.predict_proba(X_test)[:, 1]

    baseline_metrics = {
        "model_name": "Logistic Regression (Baseline)",
        "cv_mean_f1": float(np.mean(cv_baseline["test_f1"])),
        "cv_std_f1": float(np.std(cv_baseline["test_f1"])),
        "cv_mean_roc_auc": float(np.mean(cv_baseline["test_roc_auc"])),
        "test_accuracy": float(accuracy_score(y_test, y_pred_base)),
        "test_precision": float(precision_score(y_test, y_pred_base, zero_division=0)),
        "test_recall": float(recall_score(y_test, y_pred_base, zero_division=0)),
        "test_f1": float(f1_score(y_test, y_pred_base, zero_division=0)),
        "test_roc_auc": float(roc_auc_score(y_test, y_proba_base)),
        "confusion_matrix": confusion_matrix(y_test, y_pred_base).tolist(),
    }
    print(f"Baseline Test F1: {baseline_metrics['test_f1']:.4f}, ROC-AUC: {baseline_metrics['test_roc_auc']:.4f}")

    # 2. Candidate Model: Random Forest
    print("\n--- Training Candidate Model: Random Forest Classifier ---")
    candidate_pipe = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=100,
                    max_depth=8,
                    min_samples_split=6,
                    random_state=42,
                    class_weight="balanced",
                ),
            ),
        ]
    )

    cv_candidate = cross_validate(
        candidate_pipe,
        X_train,
        y_train,
        cv=skf,
        scoring=["accuracy", "precision", "recall", "f1", "roc_auc"],
    )

    candidate_pipe.fit(X_train, y_train)
    y_pred_cand = candidate_pipe.predict(X_test)
    y_proba_cand = candidate_pipe.predict_proba(X_test)[:, 1]

    cm_cand = confusion_matrix(y_test, y_pred_cand).tolist()
    candidate_metrics = {
        "model_name": "Random Forest Classifier (Candidate)",
        "cv_mean_f1": float(np.mean(cv_candidate["test_f1"])),
        "cv_std_f1": float(np.std(cv_candidate["test_f1"])),
        "cv_mean_roc_auc": float(np.mean(cv_candidate["test_roc_auc"])),
        "test_accuracy": float(accuracy_score(y_test, y_pred_cand)),
        "test_precision": float(precision_score(y_test, y_pred_cand, zero_division=0)),
        "test_recall": float(recall_score(y_test, y_pred_cand, zero_division=0)),
        "test_f1": float(f1_score(y_test, y_pred_cand, zero_division=0)),
        "test_roc_auc": float(roc_auc_score(y_test, y_proba_cand)),
        "confusion_matrix": cm_cand,
    }
    print(f"Candidate Test F1: {candidate_metrics['test_f1']:.4f}, ROC-AUC: {candidate_metrics['test_roc_auc']:.4f}")

    # Extract Feature Names & Importances from Candidate Model
    preprocessor = candidate_pipe.named_steps["preprocessor"]
    rf_clf = candidate_pipe.named_steps["classifier"]
    
    cat_encoder = preprocessor.named_transformers_["cat"]
    cat_feature_names = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
    all_feature_names = ALL_NUMERICAL_FEATURES + cat_feature_names
    
    importances = rf_clf.feature_importances_
    feature_importance_list = [
        {"feature": name, "importance": round(float(imp), 4)}
        for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)
    ]

    print("\nTop 8 Most Important Risk Features:")
    for item in feature_importance_list[:8]:
        print(f"  - {item['feature']}: {item['importance']:.4f}")

    # Save Pipeline and Metrics
    model_path = os.path.join(artifacts_dir, "model.joblib")
    metrics_path = os.path.join(artifacts_dir, "metrics.json")
    schema_path = os.path.join(artifacts_dir, "feature_schema.json")

    joblib.dump(candidate_pipe, model_path)
    print(f"\nModel pipeline serialized to {model_path}")

    # Save feature schema
    schema = get_feature_schema()
    schema["all_fitted_feature_names"] = all_feature_names
    with open(schema_path, "w") as f:
        json.dump(schema, f, indent=2)
    print(f"Feature schema saved to {schema_path}")

    # Complete metrics log
    metrics_report = {
        "model_version": "v1.0-synthetic-rf",
        "training_date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "dataset_provenance": {
            "source": "Empirically Calibrated Agricultural Economics Generator (AgriCredit Synthetic V1)",
            "is_synthetic": True,
            "sample_count": len(raw_df),
            "train_count": len(X_train),
            "test_count": len(X_test),
            "positive_class_prevalence": float(np.mean(y)),
            "limitations": "Model trained on empirical synthetic data due to banking confidentiality on individual farmer loan NPA accounts. Suitable for pipeline testing and risk factor illustration, not real lending decisions.",
        },
        "target_definition": {
            "name": "repayment_difficulty",
            "description": "Indicator of agricultural loan repayment distress or restructuring over a 12-month crop loan cycle.",
            "positive_class": 1,
            "negative_class": 0,
        },
        "baseline_model": baseline_metrics,
        "candidate_model": candidate_metrics,
        "selected_model": "candidate_model",
        "feature_importances": feature_importance_list[:15],
    }

    with open(metrics_path, "w") as f:
        json.dump(metrics_report, f, indent=2)
    print(f"Metrics report saved to {metrics_path}")

if __name__ == "__main__":
    train_and_evaluate()
