"""
Model Evaluation Script
Loads trained model and test partition, checks classification report,
prints confusion matrix and validation summary.
"""
import os
import json
import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from feature_engineering import apply_feature_engineering

def evaluate_pipeline():
    basedir = os.path.abspath(os.path.dirname(__file__))
    artifacts_dir = os.path.abspath(os.path.join(basedir, "..", "artifacts"))
    model_path = os.path.join(artifacts_dir, "model.joblib")
    metrics_path = os.path.join(artifacts_dir, "metrics.json")
    data_path = os.path.abspath(os.path.join(basedir, "..", "data", "processed", "agricultural_loans.csv"))

    if not os.path.exists(model_path) or not os.path.exists(data_path):
        print("Model or dataset missing. Run train_model.py first.")
        return

    print("=" * 60)
    print("EVALUATING SAVED AGRICREDIT ML PIPELINE")
    print("=" * 60)

    model = joblib.load(model_path)
    df = pd.read_csv(data_path)
    df_feat = apply_feature_engineering(df)

    y = df_feat["repayment_difficulty"].values
    X = df_feat.drop(columns=["repayment_difficulty"])

    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]

    print("\nOverall Dataset Evaluation:")
    print(classification_report(y, y_pred, target_names=["Low Risk (0)", "Repayment Distress (1)"]))

    cm = confusion_matrix(y, y_pred)
    print("Confusion Matrix:")
    print(f"  [TN: {cm[0][0]}, FP: {cm[0][1]}]")
    print(f"  [FN: {cm[1][0]}, TP: {cm[1][1]}]")

    auc = roc_auc_score(y, y_prob)
    print(f"\nROC-AUC Score: {auc:.4f}")

    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            metrics_data = json.load(f)
        print("\nCross-Validation Comparison from metrics.json:")
        base_f1 = metrics_data["baseline_model"]["cv_mean_f1"]
        cand_f1 = metrics_data["candidate_model"]["cv_mean_f1"]
        print(f"  - Baseline (Logistic Regression) Mean CV F1: {base_f1:.4f}")
        print(f"  - Candidate (Random Forest) Mean CV F1:     {cand_f1:.4f}")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    evaluate_pipeline()
