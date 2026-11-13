"""
Agricultural Dataset Preparation Script
Generates a realistic, documented agricultural loan dataset based on empirical
Indian agricultural economics (agro-climatic cropping patterns, KCC norms, and risk drivers).
"""
import os
import numpy as np
import pandas as pd

def generate_agricultural_dataset(num_samples: int = 3000, random_state: int = 42) -> pd.DataFrame:
    np.random.seed(random_state)

    crops_profile = {
        "Paddy": {"cost_range": (18000, 28000), "revenue_multiple": (1.4, 2.1), "season": "Kharif", "yield_range": (16.0, 25.0)},
        "Wheat": {"cost_range": (15000, 24000), "revenue_multiple": (1.3, 2.0), "season": "Rabi", "yield_range": (16.0, 26.0)},
        "Cotton": {"cost_range": (25000, 42000), "revenue_multiple": (1.3, 2.3), "season": "Kharif", "yield_range": (7.0, 14.0)},
        "Sugarcane": {"cost_range": (35000, 60000), "revenue_multiple": (1.5, 2.4), "season": "Perennial", "yield_range": (280.0, 420.0)},
        "Maize": {"cost_range": (14000, 22000), "revenue_multiple": (1.3, 1.9), "season": "Kharif", "yield_range": (18.0, 32.0)},
        "Mustard": {"cost_range": (12000, 19000), "revenue_multiple": (1.4, 2.2), "season": "Rabi", "yield_range": (6.0, 12.0)},
        "Groundnut": {"cost_range": (18000, 29000), "revenue_multiple": (1.3, 2.0), "season": "Kharif", "yield_range": (8.0, 15.0)},
        "Pulses": {"cost_range": (12000, 20000), "revenue_multiple": (1.4, 2.1), "season": "Rabi", "yield_range": (5.0, 10.0)},
    }
    crop_names = list(crops_profile.keys())

    # Farmer characteristics
    total_landholding = np.clip(np.random.exponential(scale=3.5, size=num_samples) + 0.5, 0.5, 35.0)
    # Cultivated land fraction (most cultivate 70-100% of holding)
    cultivated_fraction = np.random.uniform(0.6, 1.0, size=num_samples)
    cultivated_land = np.round(total_landholding * cultivated_fraction, 2)
    total_landholding = np.round(total_landholding, 2)

    farming_experience = np.random.randint(1, 45, size=num_samples)
    land_ownership = np.random.choice(["owned", "leased", "mixed"], size=num_samples, p=[0.72, 0.18, 0.10])

    # Crop selections
    primary_crops = np.random.choice(crop_names, size=num_samples, p=[0.25, 0.20, 0.15, 0.10, 0.10, 0.08, 0.07, 0.05])
    primary_seasons = [crops_profile[c]["season"] for c in primary_crops]

    # Economics calculation per acre
    total_seasonal_cultivation_cost = []
    total_seasonal_crop_revenue = []
    expected_yield_per_acre = []

    for i in range(num_samples):
        c_name = primary_crops[i]
        c_area = cultivated_land[i]
        c_profile = crops_profile[c_name]
        
        base_cost_acre = np.random.uniform(c_profile["cost_range"][0], c_profile["cost_range"][1])
        rev_mult = np.random.uniform(c_profile["revenue_multiple"][0], c_profile["revenue_multiple"][1])
        base_yield = np.random.uniform(c_profile["yield_range"][0], c_profile["yield_range"][1])
        
        # Inject realistic agricultural variability (weather/pest shock chance ~12%)
        shock_factor = 1.0
        if np.random.rand() < 0.12:
            shock_factor = np.random.uniform(0.4, 0.8)  # Harvest loss
            
        cost_total = round(base_cost_acre * c_area, 2)
        rev_total = round(base_cost_acre * rev_mult * shock_factor * c_area, 2)
        yield_total = round(base_yield * shock_factor, 2)
        
        total_seasonal_cultivation_cost.append(cost_total)
        total_seasonal_crop_revenue.append(rev_total)
        expected_yield_per_acre.append(yield_total)

    total_seasonal_cultivation_cost = np.array(total_seasonal_cultivation_cost)
    total_seasonal_crop_revenue = np.array(total_seasonal_crop_revenue)
    expected_yield_per_acre = np.array(expected_yield_per_acre)
    estimated_crop_surplus = np.round(total_seasonal_crop_revenue - total_seasonal_cultivation_cost, 2)

    # Requested loan based on cultivation scale (typically 50% to 120% of cultivation cost + equipment)
    loan_multiplier = np.random.uniform(0.5, 1.4, size=num_samples)
    requested_loan_amount = np.round(total_seasonal_cultivation_cost * loan_multiplier, -2)
    requested_loan_amount = np.clip(requested_loan_amount, 20000.0, 1500000.0)

    requested_loan_tenure_months = np.random.choice([6, 12, 18, 24, 36], size=num_samples, p=[0.20, 0.50, 0.15, 0.10, 0.05])

    previous_loan_history = np.random.choice(
        ["clean", "first_time_borrower", "minor_delay", "defaulted"],
        size=num_samples,
        p=[0.60, 0.22, 0.13, 0.05],
    )

    # Existing outstanding debt
    has_existing_debt = np.random.rand(num_samples) > 0.35
    existing_outstanding_debt = np.where(
        has_existing_debt,
        np.round(np.random.exponential(scale=60000.0, size=num_samples), -2),
        0.0,
    )
    existing_outstanding_debt = np.clip(existing_outstanding_debt, 0.0, 800000.0)

    # Verified other non-farm income (allied dairy, poultry, remittance)
    has_other_income = np.random.rand(num_samples) > 0.40
    other_verified_annual_income = np.where(
        has_other_income,
        np.round(np.random.uniform(15000, 120000, size=num_samples), -2),
        0.0,
    )

    # Subsidies received (PM-KISAN ₹6000 or input subsidies)
    has_subsidy = np.random.rand(num_samples) > 0.25
    subsidy_received = np.where(
        has_subsidy,
        np.random.choice([6000.0, 12000.0, 18000.0, 25000.0], size=num_samples, p=[0.6, 0.2, 0.1, 0.1]),
        0.0,
    )

    # Ground-truth label generation using transparent agricultural credit risk rules
    # Target: repayment_difficulty (1 = Repayment distress/default risk, 0 = Timely repayment)
    # We construct the probability of repayment distress based on economic ratios:
    dscr_proxy = (
        (estimated_crop_surplus + (other_verified_annual_income * 0.5) + subsidy_received)
        / (np.maximum(10000.0, (existing_outstanding_debt * 0.2) + (requested_loan_amount * 0.5)))
    )
    
    risk_score = np.zeros(num_samples)
    risk_score += np.where(dscr_proxy < 0.8, 2.5, 0.0)
    risk_score += np.where(dscr_proxy < 1.1, 1.2, 0.0)
    risk_score += np.where(estimated_crop_surplus < 0, 2.0, 0.0)
    risk_score += np.where(previous_loan_history == "defaulted", 3.0, 0.0)
    risk_score += np.where(previous_loan_history == "minor_delay", 1.0, 0.0)
    risk_score += np.where(existing_outstanding_debt > 150000.0, 1.0, 0.0)
    risk_score += np.where(requested_loan_amount > (total_seasonal_cultivation_cost * 1.5), 1.2, 0.0)
    risk_score += np.where(land_ownership == "leased", 0.6, 0.0)
    risk_score -= np.where(farming_experience > 15, 0.5, 0.0)
    risk_score -= np.where(other_verified_annual_income > 60000.0, 0.8, 0.0)

    # Convert risk_score to sigmoid probability
    prob_distress = 1.0 / (1.0 + np.exp(-(risk_score - 2.8)))
    repayment_difficulty = (np.random.rand(num_samples) < prob_distress).astype(int)

    df = pd.DataFrame({
        "total_landholding_acres": total_landholding,
        "cultivated_land_current_season_acres": cultivated_land,
        "farming_experience_years": farming_experience,
        "land_ownership": land_ownership,
        "primary_crop": primary_crops,
        "primary_season": primary_seasons,
        "requested_loan_amount": requested_loan_amount,
        "requested_loan_tenure_months": requested_loan_tenure_months,
        "previous_loan_history": previous_loan_history,
        "existing_outstanding_debt": existing_outstanding_debt,
        "other_verified_annual_income": other_verified_annual_income,
        "subsidy_received": subsidy_received,
        "total_seasonal_crop_revenue": total_seasonal_crop_revenue,
        "total_seasonal_cultivation_cost": total_seasonal_cultivation_cost,
        "estimated_crop_surplus": estimated_crop_surplus,
        "expected_yield_per_acre": expected_yield_per_acre,
        "repayment_difficulty": repayment_difficulty,
    })

    return df

def main():
    basedir = os.path.abspath(os.path.dirname(__file__))
    data_dir = os.path.abspath(os.path.join(basedir, "..", "data"))
    synthetic_dir = os.path.join(data_dir, "synthetic")
    processed_dir = os.path.join(data_dir, "processed")
    
    os.makedirs(synthetic_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)

    print("Generating transparent synthetic agricultural loans dataset...")
    df = generate_agricultural_dataset(num_samples=3000, random_state=42)

    synthetic_file = os.path.join(synthetic_dir, "synthetic_agri_loans.csv")
    processed_file = os.path.join(processed_dir, "agricultural_loans.csv")

    df.to_csv(synthetic_file, index=False)
    df.to_csv(processed_file, index=False)

    print(f"Dataset successfully created and saved to:")
    print(f"  - {synthetic_file}")
    print(f"  - {processed_file}")
    print(f"Shape: {df.shape}")
    print(f"Repayment difficulty rate: {df['repayment_difficulty'].mean():.2%}")

if __name__ == "__main__":
    main()
