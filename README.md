# AgriCredit — Agricultural Loan Eligibility and Repayment Risk Assessment System

AgriCredit is a specialized agricultural credit assessment platform designed for rural financial institutions, cooperative credit societies, and agricultural lenders. Unlike generic consumer credit scoring engines that assume fixed monthly salaries and urban credit bureau histories, AgriCredit evaluates creditworthiness directly from farming economics: cultivated acreage, multi-crop seasonal revenues, input cost intensities, government subsidies, and Debt Service Coverage Ratios (DSCR).

---

## 1. System Architecture

```
agricredit/
  frontend/
    src/
      api/client.js              # Axios API service with auth token interceptor
      components/                # Navbar, Footer, StatusBadge, RiskBadge, CurrencyFormatter
      pages/
        LandingPage.jsx          # Agricultural loan introduction & workflow
        DashboardPage.jsx        # Real-time portfolio metrics, Recharts analytics, recent applications
        NewApplicationPage.jsx   # 6-step wizard: Farmer -> Loan -> Crop Agronomy -> Subsidy -> Docs -> Review
        ApplicationDetailPage.jsx# Detailed crop economics, subsidy accounting, evidence, audit trail
        AssessmentResultPage.jsx # Dual-engine assessment report, DSCR, ML risk indicator, print sheet
        ModelInfoPage.jsx        # Dataset provenance, 5-fold CV metrics, confusion matrix, feature importances
        AdminReviewPage.jsx      # Credit officer decision commit, notes, and information requests
        LoginPage.jsx            # Secure officer authentication
      styles/                    # Deep forest green theme tokens, standard CSS (No Tailwind)
      App.jsx                    # React Router configuration
      main.jsx                   # React entry point
    public/                      # SVG favicon and static assets
    package.json
    .env.example

  backend/
    app/
      __init__.py                # Flask application factory, database initialization
      config.py                  # Environment configuration, upload limits, CORS origins
      extensions.py              # SQLAlchemy, CORS instances
      models/                    # AdminUser, Farmer, LoanApplication, CropDetail, Assessment, HumanReview, History
      routes/                    # auth, farmer, application, assessment, dashboard, dataset, admin
      services/
        cashflow_service.py      # Multi-crop harvest revenue, cultivation cost, amortization, DSCR
        subsidy_service.py       # PM-KISAN & SMAM subsidy separation & non-duplication
        assessment_service.py    # Dual-engine evaluation coordinator
      utils/
        auth.py                  # Token signing, verification, and role decorators
      tests/                     # Pytest suite (13 passing tests)
    ml/
      data/
        raw/                     # Raw agricultural references
        processed/               # Processed agricultural loan dataset
        synthetic/               # Documented empirical agricultural synthetic benchmark
      src/
        inspect_dataset.py       # Schema, nulls, duplicates, and statistical inspection
        prepare_dataset.py       # Empirical agricultural economics generator
        feature_engineering.py   # Ratios, StandardScaler, OneHotEncoder, ColumnTransformer
        train_model.py           # Baseline (Logistic Regression) vs Candidate (Random Forest), 5-Fold CV
        evaluate_model.py        # Independent test set evaluation & confusion matrix
        predict.py               # Robust inference module with graceful fallback mode
      artifacts/
        model.joblib             # Serialized Candidate Random Forest pipeline
        metrics.json             # Cross-validation scores, test metrics, feature importances
        feature_schema.json      # Expected input feature schema
    requirements.txt
    run.py                       # Server entry point
    .env.example

  README.md
  .gitignore
```

---

## 2. Agricultural Financial Calculations

All farm economics calculations are implemented in `app/services/cashflow_service.py`:

### Crop Revenue & Input Expenses
For each crop entry $i$:
$$\text{Gross Crop Revenue}_i = \text{Cultivated Acres}_i \times \text{Yield Per Acre}_i \times \text{Selling Price Per Unit}_i \times \text{Cycles}_i$$

$$\text{Total Cultivation Cost}_i = (\text{Seeds} + \text{Fertilizer} + \text{Pesticides} + \text{Labour} + \text{Irrigation} + \text{Machinery} + \text{Other}) \times \text{Cycles}_i$$

$$\text{Estimated Crop Surplus}_i = \text{Gross Crop Revenue}_i - \text{Total Cultivation Cost}_i$$

### Agricultural Operating Surplus
$$\text{Operating Surplus} = \sum_{i} \text{Gross Crop Revenue}_i - \sum_{i} \text{Total Cultivation Cost}_i$$

### Subsidies Accounting
- **Confirmed Subsidy Received**: Counted in liquid cash flow (e.g. ₹6,000 PM-KISAN cash credit).
- **Approved Pending Subsidy**: Tracked separately as contingent liquidity; **not** counted as immediate cash.
- **Applied-For (Unapproved) Subsidy**: Strictly **excluded** from guaranteed income.

### Debt Service Coverage Ratio (DSCR)
$$\text{Seasonal Debt Inflow} = \text{Operating Surplus} + \text{Verified Other Income (6M)} + \text{Confirmed Subsidy}$$
$$\text{Total Debt Service (6M)} = \text{Existing Debt Service (6M)} + \text{Proposed Loan Installment (6M)}$$
$$\text{DSCR} = \frac{\text{Seasonal Debt Inflow}}{\text{Total Debt Service (6M)}}$$

**Decision Thresholds:**
- $\text{DSCR} \ge 1.25$: `ASSESSMENT_SUPPORTIVE` (Adequate liquidity buffer against monsoon/price volatility).
- $1.00 \le \text{DSCR} < 1.25$ or $\text{Operating Surplus} < 0$: `MANUAL_REVIEW` (Narrow coverage or deficit requiring officer review).
- Missing crop or financial data: `INSUFFICIENT_DATA` (Disclosures required).

---

## 3. Data Provenance & Machine Learning Pipeline

### Public Data Limitations
Institutional borrower-level loan default and NPA records in India are strictly restricted under Reserve Bank of India (RBI) borrower confidentiality directives and banking secrecy statutes. Public portals (e.g., data.gov.in) provide macro-level state credit statistics rather than granular loan-level records.

### Empirical Agricultural Synthetic Modeling
To maintain scientific transparency without fabricating data, `prepare_dataset.py` synthesizes 3,000 agricultural credit records grounded in authentic Indian agro-economic parameters:
- **Agro-climatic rotations**: Kharif, Rabi, and Zaid crops (Paddy, Wheat, Cotton, Sugarcane, Maize, Mustard, Groundnut, Pulses).
- **Scale of Finance**: Input costs and yield distributions calibrated to NABARD district guidelines.
- **Target Variable**: `repayment_difficulty` (Binary 0 = Timely Repayment, 1 = Documented Repayment Distress).

### Model Training & Cross-Validation Results

| Metric | Baseline: Logistic Regression | Candidate: Random Forest (Selected) |
|---|---|---|
| **5-Fold Cross-Validation Mean F1** | 0.5928 | **0.6186** |
| **5-Fold Cross-Validation ROC-AUC** | 0.8270 | **0.8297** |
| **Independent Test Accuracy** | 86.83% | **88.67%** |
| **Distress Class Precision** | 64.21% | **68.25%** |
| **Distress Class Recall** | 71.56% | **79.01%** |
| **Overall Dataset ROC-AUC** | 0.8841 | **0.9449** |

### Top 5 Predictive Agronomic Features
1. `debt_to_annual_income_ratio` (17.50% weight)
2. `surplus_to_loan_ratio` (14.69% weight)
3. `estimated_crop_surplus` (9.30% weight)
4. `cost_to_revenue_ratio` (9.17% weight)
5. `other_verified_annual_income` (8.76% weight)

---

## 4. Run Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ & npm 9+

### Terminal 1: Backend Setup & Execution
```bash
cd agricredit/backend

# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Inspect dataset & train ML pipeline
python ml/src/prepare_dataset.py
python ml/src/train_model.py
python ml/src/evaluate_model.py

# 4. Run automated test suite
PYTHONPATH=. pytest app/tests/ -v

# 5. Start Flask Server (Runs on http://127.0.0.1:5000)
python run.py
```

### Terminal 2: Frontend Setup & Execution
```bash
cd agricredit/frontend

# 1. Install dependencies
npm install

# 2. Start Vite Development Server (Runs on http://127.0.0.1:5173)
npm run dev
```

### Default Officer Login Credentials
- **Username:** `admin`
- **Password:** `AgriAdmin@2026`

---

## 5. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and version |
| `GET` | `/api/dashboard/summary` | Real-time portfolio metrics, crop acreage, status counts |
| `POST` | `/api/applications` | Submit multi-crop loan application (triggers auto-assessment) |
| `GET` | `/api/applications` | List applications with pagination and status filters |
| `GET` | `/api/applications/<id>` | Full application details with crops, evidence, and audit history |
| `POST` | `/api/applications/<id>/documents` | Upload supporting land or crop evidence |
| `GET` | `/api/applications/<id>/documents/<doc_id>/download` | Secure document download |
| `POST` | `/api/applications/<id>/calculate-cashflow` | On-the-fly cash-flow preview |
| `POST` | `/api/applications/<id>/assess` | Re-run dual cash-flow & ML assessment |
| `GET` | `/api/applications/<id>/assessment` | Fetch explainable credit assessment report |
| `GET` | `/api/dataset/info` | Dataset provenance, schema, and sample counts |
| `GET` | `/api/model/info` | ML model metrics, cross-validation scores, feature importances |
| `POST` | `/api/auth/login` | Officer login (returns HMAC signed token) |
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `POST` | `/api/admin/applications/<id>/review` | Commit human sanction/decline decision and notes |
| `POST` | `/api/admin/applications/<id>/request-information` | Request additional evidence from applicant |
| `POST` | `/api/admin/seed-demo-data` | Seeds realistic demonstration applications |

---

## 6. Automated Test Suite (13/13 Passing Tests)

```
app/tests/test_api.py::test_health_endpoint PASSED
app/tests/test_api.py::test_create_application_validation PASSED
app/tests/test_api.py::test_create_valid_application_and_auto_assessment PASSED
app/tests/test_api.py::test_dataset_and_model_info_endpoints PASSED
app/tests/test_api.py::test_auth_and_human_review_workflow PASSED
app/tests/test_assessment.py::test_crop_area_exceeding_cultivated_land_flagged PASSED
app/tests/test_assessment.py::test_negative_surplus_triggers_manual_review PASSED
app/tests/test_assessment.py::test_model_predictor_graceful_fallback PASSED
app/tests/test_cashflow.py::test_single_crop_revenue_and_cost PASSED
app/tests/test_cashflow.py::test_multiple_crops_aggregation PASSED
app/tests/test_cashflow.py::test_subsidy_separation_and_unapproved_exclusion PASSED
app/tests/test_cashflow.py::test_missing_crop_data_returns_insufficient_data PASSED
app/tests/test_cashflow.py::test_amortization_calculation PASSED
```

---

## 7. Regulatory & Ethical Safeguards

1. **Educational & Decision-Support Prototype**: AgriCredit is explicitly structured as an advisory tool for loan officers. It does not issue binding automated loan sanctions or rejections.
2. **Zero Sensitive Data Collection**: The platform does not collect Aadhaar numbers, biometric records, or religion/caste markers.
3. **No Simplistic Acreage Rejection**: Smallholder farmers are not automatically rejected based on land size; debt serviceability is evaluated relative to actual cultivation output and allied income.
4. **Human-in-the-Loop**: Automated ML predictions cannot overwrite human credit committee decisions.
# Datascience-Project
