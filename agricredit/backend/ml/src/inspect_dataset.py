"""
Dataset Inspection Script
Inspects raw and processed dataset schema, missing values, duplicates,
summary statistics, and target class distributions.
"""
import os
import pandas as pd

def inspect_dataset(file_path: str):
    print("=" * 60)
    print(f"INSPECTING DATASET: {file_path}")
    print("=" * 60)

    if not os.path.exists(file_path):
        print(f"Error: Dataset file not found at {file_path}")
        return

    df = pd.read_csv(file_path)

    print(f"\n1. Dimensions: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"2. Duplicates: {df.duplicated().sum()} rows")
    
    print("\n3. Missing Value Analysis:")
    nulls = df.isnull().sum()
    if nulls.sum() == 0:
        print("   No missing values detected.")
    else:
        for col, count in nulls[nulls > 0].items():
            print(f"   - {col}: {count} ({count/len(df):.1%})")

    print("\n4. Column Types:")
    for col, dtype in df.dtypes.items():
        print(f"   - {col}: {dtype}")

    if "repayment_difficulty" in df.columns:
        print("\n5. Target Variable Distribution ('repayment_difficulty'):")
        counts = df["repayment_difficulty"].value_counts()
        for label, count in counts.items():
            name = "Difficulty/Distress (1)" if label == 1 else "Regular/Low Risk (0)"
            print(f"   - {name}: {count} ({count/len(df):.2%})")

    print("\n6. Numerical Summary Statistics:")
    num_cols = df.select_dtypes(include=["number"]).columns
    print(df[num_cols].describe().T[["mean", "std", "min", "50%", "max"]].to_string())

    print("\n7. Categorical Distributions:")
    cat_cols = df.select_dtypes(include=["object", "str"]).columns
    for c in cat_cols:
        print(f"\n   Feature '{c}':")
        print(df[c].value_counts(normalize=True).round(3).to_string())

    print("\n" + "=" * 60)
    print("INSPECTION COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    basedir = os.path.abspath(os.path.dirname(__file__))
    default_path = os.path.abspath(os.path.join(basedir, "..", "data", "processed", "agricultural_loans.csv"))
    inspect_dataset(default_path)
