# AgriCredit Machine Learning Pipeline & Data Provenance

## 1. Data Provenance & Source Exploration

### Public Repositories Evaluated
During project discovery, we surveyed available agricultural loan and credit repositories:
1. **Open Government Data Platform India (data.gov.in)**:
   - Macro-level tables on agricultural credit disbursements, state-wise Kisan Credit Card (KCC) targets, and non-performing asset (NPA) percentages from NABARD and RBI are published.
   - Granular, borrower-level farmer repayment histories are strictly restricted under the Reserve Bank of India (RBI) borrower privacy regulations and the Banking Companies (Acquisition and Transfer of Undertakings) Act.
2. **Kaggle & Academic Repositories**:
   - Generic credit datasets (e.g. LendingClub, Home Credit) exist, but reflect unsecured personal or consumer credit in urban contexts, devoid of monsoon seasonality, crop yields, and agricultural subsidies.
   - Agricultural yield datasets (e.g. ICRISAT, Directorate of Economics and Statistics) provide harvest yield and market price benchmarks, but lack borrower debt histories.

### Ethical Dataset Strategy & Transparent Synthetic Modeling
To respect banking privacy laws while providing a reproducible, scientifically defensible end-to-end Data Science pipeline, this project implements:
1. **Empirical Agricultural Economics Benchmark Generator (`prepare_dataset.py`)**:
   - Generates 3,000 realistic agricultural loan applicant records calibrated to Indian agricultural parameters (agro-climatic zones, typical Kharif/Rabi cropping patterns, KCC land-based scale-of-finance norms).
   - Generates repayment distress labels based on transparent agricultural financial distress rules (e.g., negative crop surplus, debt-service coverage < 0.9, severe prior delinquency, combined with weather shock probabilities).
2. **Strict Limitations & Transparency**:
   - This dataset is explicitly documented as **SYNTHETIC DEMO PIPELINE DATA**.
   - Model metrics are educational validation indicators of the modeling pipeline; they are **NOT** claimed to prove real-world predictive validity against actual bank portfolios.
   - In production, financial institutions must substitute this data with their own audited, anonymized historical loan performance records.

---

## 2. Target Variable & Prediction Horizon

- **Target Column**: `repayment_difficulty`
- **Classes**:
  - `0`: Regular Repayment / Low Risk (Farmer met agricultural loan obligations on schedule).
  - `1`: Repayment Difficulty / Elevated Risk (Farmer experienced loan distress, 90+ DPD overdue, or required restructuring).
- **Positive Class**: `1` (Repayment Difficulty).
- **Prediction Horizon**: 12-month crop loan cycle.

---

## 3. Feature Definitions

| Feature | Type | Description |
|---|---|---|
| `total_landholding_acres` | Numeric | Total land owned/leased by farmer in acres |
| `cultivated_land_current_season_acres` | Numeric | Land under active cultivation in current season |
| `farming_experience_years` | Numeric | Number of years farming |
| `land_ownership` | Categorical | `owned`, `leased`, or `mixed` |
| `primary_crop` | Categorical | Main cultivated crop (e.g. `Paddy`, `Wheat`, `Cotton`, `Sugarcane`, `Maize`) |
| `primary_season` | Categorical | `Kharif`, `Rabi`, or `Zaid` |
| `requested_loan_amount` | Numeric | Loan amount requested in INR |
| `requested_loan_tenure_months` | Numeric | Tenure requested (typically 6-36 months) |
| `previous_loan_history` | Categorical | `clean`, `minor_delay`, `defaulted`, `first_time_borrower` |
| `existing_outstanding_debt` | Numeric | Total existing debt obligations in INR |
| `other_verified_annual_income` | Numeric | Non-farm or allied verified income in INR |
| `subsidy_received` | Numeric | Verified government agricultural subsidy in INR |
| `total_seasonal_crop_revenue` | Numeric | Estimated harvest value |
| `total_seasonal_cultivation_cost` | Numeric | Total input costs (seeds, fertilizer, labor, irrigation) |
| `estimated_crop_surplus` | Numeric | `crop_revenue - cultivation_cost` |

### Engineered Features
- `surplus_to_loan_ratio`: Farming surplus divided by requested loan amount.
- `debt_to_annual_income_ratio`: Total debt burden divided by annual gross agricultural & other income.
- `cultivated_ratio`: Proportion of total land actively cultivated.
- `cost_to_revenue_ratio`: Operational input intensity per unit revenue.
- `subsidy_share_of_cost`: Proportion of cultivation costs buffered by verified subsidy.

---

## 4. Model Training & Comparison

We compare:
1. **Baseline Model**: Logistic Regression with balanced class weighting.
2. **Candidate Model**: Random Forest Classifier (100 trees, max depth 8, balanced class weighting).

Evaluation methodology:
- 80/20 Stratified Train/Test split.
- 5-Fold Stratified Cross-Validation on the training set.
- Metrics evaluated: Accuracy, Precision, Recall, F1-Score, ROC-AUC, and Confusion Matrix.
- Focus on Recall and Precision of the positive class (`repayment_difficulty = 1`), recognizing the asymmetric cost of undetected credit distress.
