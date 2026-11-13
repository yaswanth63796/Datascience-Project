"""
Agricultural Assessment Coordinator Service
Synthesizes deterministic Cash-Flow Assessment and ML Risk Assessment
into an explainable, transparent credit assessment with clear next steps.
"""
from typing import Dict, Any, List, Optional
import json
from app.services.cashflow_service import CashFlowService
from app.models.application import LoanApplication
from app.models.assessment import CashFlowAssessment, MLAssessment
from app.models.history import AssessmentHistory
from app.extensions import db
import os
import sys

# Import ML predictor
ml_src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml", "src"))
if ml_src_path not in sys.path:
    sys.path.append(ml_src_path)

try:
    from predict import AgriModelPredictor
    predictor = AgriModelPredictor()
except Exception as e:
    print(f"Warning: Failed to initialize AgriModelPredictor: {e}")
    predictor = None

class AssessmentService:
    @staticmethod
    def run_full_assessment(
        application_id: int,
        assumed_interest_rate: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Executes both cashflow and ML assessment, persists records to database,
        and logs audit trail history.
        """
        application = db.session.get(LoanApplication, application_id)
        if not application:
            raise ValueError(f"Application with ID {application_id} not found.")

        farmer = application.farmer
        if not farmer:
            raise ValueError(f"Farmer record missing for application {application_id}.")

        rate = assumed_interest_rate if assumed_interest_rate is not None else 7.0

        farmer_dict = farmer.to_dict()
        app_dict = application.to_dict(include_relations=False)
        crops_dict = [c.to_dict() for c in application.crops]

        # 1. Deterministic Cash-Flow Calculation
        cf_result = CashFlowService.evaluate_agricultural_cashflow(
            farmer_data=farmer_dict,
            application_data=app_dict,
            crops_data=crops_dict,
            assumed_interest_rate=rate,
        )

        # Upsert CashFlowAssessment
        cf_record = application.cashflow_assessment
        if not cf_record:
            cf_record = CashFlowAssessment(application_id=application.id)
            db.session.add(cf_record)

        cf_record.total_seasonal_crop_revenue = cf_result["total_seasonal_crop_revenue"]
        cf_record.total_seasonal_cultivation_cost = cf_result["total_seasonal_cultivation_cost"]
        cf_record.estimated_agricultural_operating_surplus = cf_result["estimated_agricultural_operating_surplus"]
        cf_record.verified_other_income_period = cf_result["verified_other_income_period"]
        cf_record.confirmed_subsidy_period = cf_result["confirmed_subsidy_period"]
        cf_record.pending_subsidy_tracked = cf_result["pending_subsidy_tracked"]
        cf_record.existing_debt_service_period = cf_result["existing_debt_service_period"]
        cf_record.proposed_loan_installment_monthly = cf_result["proposed_loan_installment_monthly"]
        cf_record.proposed_debt_service_period = cf_result["proposed_debt_service_period"]
        cf_record.total_debt_service_period = cf_result["total_debt_service_period"]
        cf_record.estimated_net_available_cashflow = cf_result["estimated_net_available_cashflow"]
        cf_record.debt_service_coverage_ratio = cf_result["debt_service_coverage_ratio"]
        cf_record.assumed_annual_interest_rate_pct = cf_result["assumed_annual_interest_rate_pct"]
        cf_record.cashflow_verdict = cf_result["cashflow_verdict"]
        cf_record.cashflow_notes = json.dumps(cf_result["cashflow_notes"])

        # 2. Machine Learning Risk Assessment
        if predictor:
            ml_result = predictor.predict_risk(
                farmer_data=farmer_dict,
                application_data=app_dict,
                crops_data=crops_dict,
                cashflow_result=cf_result,
            )
        else:
            ml_result = {
                "predicted_risk_class": "MODERATE_RISK",
                "repayment_difficulty_probability": None,
                "model_version": "unavailable",
                "model_name": "AgriCredit ML Predictor Unavailable",
                "is_fallback": True,
                "fallback_reason": "ML predictor engine could not be instantiated.",
                "key_contributing_factors": ["Predictor initialization failure."],
                "limitations_disclaimer": "Evaluated on cash-flow indicators only.",
            }

        # Upsert MLAssessment
        ml_record = application.ml_assessment
        if not ml_record:
            ml_record = MLAssessment(application_id=application.id)
            db.session.add(ml_record)

        ml_record.predicted_risk_class = ml_result["predicted_risk_class"]
        ml_record.repayment_difficulty_probability = ml_result["repayment_difficulty_probability"]
        ml_record.model_version = ml_result["model_version"]
        ml_record.model_name = ml_result["model_name"]
        ml_record.is_fallback = ml_result["is_fallback"]
        ml_record.fallback_reason = ml_result["fallback_reason"]
        ml_record.key_contributing_factors = json.dumps(ml_result["key_contributing_factors"])
        ml_record.limitations_disclaimer = ml_result["limitations_disclaimer"]

        # 3. Overall Combined Recommendation
        cf_verdict = cf_result["cashflow_verdict"]
        ml_class = ml_result["predicted_risk_class"]

        if cf_verdict == "INSUFFICIENT_DATA":
            recommended_next_step = "INSUFFICIENT_DATA"
            recommendation_reason = "Crucial agricultural revenue, crop acreage, or income parameters are missing or incomplete. Request additional applicant disclosures."
        elif cf_verdict == "MANUAL_REVIEW" or ml_class == "ELEVATED_RISK":
            recommended_next_step = "MANUAL_REVIEW"
            if cf_verdict == "MANUAL_REVIEW" and ml_class == "ELEVATED_RISK":
                recommendation_reason = "Both cash-flow debt service coverage and ML risk indicators signal elevated repayment vulnerability. Senior credit officer and field review required."
            elif cf_verdict == "MANUAL_REVIEW":
                recommendation_reason = "Agricultural operating cash flow indicates narrow repayment coverage or high prior leverage. Field verification of yields and collateral required."
            else:
                recommendation_reason = "Exploratory ML model flagged risk factors (e.g. prior credit history or debt ratio). Requires credit analyst inspection."
        else:
            recommended_next_step = "ASSESSMENT_SUPPORTIVE"
            recommendation_reason = "Farming cash flow and risk profile appear supportive of requested credit under assumed terms. Proceed to standard institutional verification."

        # Check for unverified documents or missing evidence
        missing_documents = []
        doc_types = {d.document_type for d in application.documents}
        if "land_record" not in doc_types:
            missing_documents.append("Land Ownership/Lease Agreement Record (Patta/Chitta/7-12 extract)")
        if "crop_record" not in doc_types:
            missing_documents.append("Seasonal Sowing / Crop Cultivation Certificate")
        if application.subsidy_received > 0 and "subsidy_receipt" not in doc_types:
            missing_documents.append("Government Subsidy Sanction Order or Bank Passbook Credit Entry")

        # Compute direct loan eligibility decision: Can we give the loan or not?
        cf_record_dict = cf_record.to_dict()
        ml_record_dict = ml_record.to_dict()
        loan_decision = AssessmentService.compute_loan_decision(
            application_data=app_dict,
            farmer_data=farmer_dict,
            cashflow_dict=cf_record_dict,
            ml_dict=ml_record_dict,
            missing_documents=missing_documents,
        )

        # Update application status if currently SUBMITTED
        if application.status in ["SUBMITTED", "DRAFT"]:
            application.status = "ASSESSED"

        # Log History Audit Entry
        history_entry = AssessmentHistory(
            application_id=application.id,
            action="CREDIT_ASSESSMENT_COMPLETED",
            performed_by="AgriCredit Assessment Engine",
            details=f"Can Give Loan: {loan_decision['can_give_loan']} | Cashflow: {cf_verdict} | ML: {ml_class} | Max Supportable: ₹{loan_decision['max_recommended_loan_amount'] or 0:,.0f}",
        )
        db.session.add(history_entry)
        db.session.commit()

        return {
            "application_id": application.id,
            "application_number": application.application_number,
            "loan_decision": loan_decision,
            "cashflow_assessment": cf_record_dict,
            "ml_assessment": ml_record_dict,
            "recommended_next_step": recommended_next_step,
            "recommendation_reason": recommendation_reason,
            "missing_documents": missing_documents,
            "disclaimer": (
                "AgriCredit is an agricultural loan decision-support and risk-assessment prototype. "
                "Final credit sanctioning remains subject to formal human review, physical field verification, "
                "and applicable institutional lending policies."
            ),
        }

    @staticmethod
    def compute_loan_decision(
        application_data: Dict[str, Any],
        farmer_data: Optional[Dict[str, Any]] = None,
        cashflow_dict: Optional[Dict[str, Any]] = None,
        ml_dict: Optional[Dict[str, Any]] = None,
        missing_documents: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Determines unambiguous answer to 'Can we give the loan or not?':
        Returns:
            - can_give_loan: 'YES' | 'NO' | 'CONDITIONAL' | 'INSUFFICIENT_DATA'
            - decision_badge: 'ELIGIBLE' | 'NOT_RECOMMENDED' | 'CONDITIONAL_SANCTION' | 'DISCLOSURES_NEEDED'
            - headline: Direct plain-English verdict header
            - requested_loan_amount: float
            - max_recommended_loan_amount: float (based on DSCR = 1.25 sustainable capacity)
            - surplus_or_shortfall_amount: float
            - dscr: float or None
            - target_dscr_benchmark: 1.25
            - verdict_summary: Comprehensive explanation
            - reasons: List[str]
            - conditions: List[str]
        """
        if not cashflow_dict:
            return {
                "can_give_loan": "PENDING",
                "decision_badge": "PENDING_ASSESSMENT",
                "headline": "ASSESSMENT PENDING",
                "requested_loan_amount": float(application_data.get("requested_loan_amount") or 0.0),
                "max_recommended_loan_amount": None,
                "surplus_or_shortfall_amount": None,
                "dscr": None,
                "target_dscr_benchmark": 1.25,
                "verdict_summary": "Credit assessment has not been executed yet. Run assessment to generate eligibility decision.",
                "reasons": ["Automated cash flow and repayment risk pipeline awaiting execution."],
                "conditions": [],
            }

        requested_loan = max(0.0, float(application_data.get("requested_loan_amount") or 0.0))
        tenure_months = max(1, int(application_data.get("requested_loan_tenure_months") or 12))
        previous_history = (application_data.get("previous_loan_history") or "first_time_borrower").lower()

        cf_verdict = cashflow_dict.get("cashflow_verdict", "MANUAL_REVIEW")
        dscr = cashflow_dict.get("debt_service_coverage_ratio")
        operating_surplus = float(cashflow_dict.get("estimated_agricultural_operating_surplus") or 0.0)
        net_cashflow = float(cashflow_dict.get("estimated_net_available_cashflow") or 0.0)
        cultivation_cost = float(cashflow_dict.get("total_seasonal_cultivation_cost") or 0.0)
        crop_revenue = float(cashflow_dict.get("total_seasonal_crop_revenue") or 0.0)
        other_income = float(cashflow_dict.get("verified_other_income_period") or 0.0)
        confirmed_subsidy = float(cashflow_dict.get("confirmed_subsidy_period") or 0.0)
        existing_debt_service = float(cashflow_dict.get("existing_debt_service_period") or 0.0)
        assumed_rate = float(cashflow_dict.get("assumed_annual_interest_rate_pct") or 7.0)

        operating_cash_inflow = round(operating_surplus + other_income + confirmed_subsidy, 2)

        max_supportable = CashFlowService.calculate_max_supportable_loan(
            operating_cash_inflow=operating_cash_inflow,
            existing_debt_service_seasonal=existing_debt_service,
            tenure_months=tenure_months,
            annual_interest_rate_pct=assumed_rate,
            target_dscr=1.25,
        )

        ml_risk = ml_dict.get("predicted_risk_class", "MODERATE_RISK") if ml_dict else "MODERATE_RISK"
        ml_prob = ml_dict.get("repayment_difficulty_probability") if ml_dict else None

        surplus_or_shortfall = round(max_supportable - requested_loan, 2)
        reasons = []
        conditions = []

        # Decision Evaluation Rules
        if cf_verdict == "INSUFFICIENT_DATA" or requested_loan <= 0 or (crop_revenue == 0 and other_income == 0):
            can_give_loan = "INSUFFICIENT_DATA"
            decision_badge = "DISCLOSURES_NEEDED"
            headline = "CANNOT DECIDE — INSUFFICIENT DATA"
            reasons.append("Crop acreage, cultivation cost breakdown, or harvest income figures are incomplete.")
            reasons.append("Bankable cashflow and debt service capacity cannot be verified without complete agricultural disclosures.")
            verdict_summary = "Cannot recommend loan sanction at this time due to missing agricultural disclosures. Request applicant to provide complete crop acreage, input costs, and yield figures."

        elif (
            previous_history == "defaulted"
            or operating_surplus < 0
            or operating_cash_inflow <= 0
            or (dscr is not None and dscr < 1.0)
            or max_supportable <= 0
        ):
            can_give_loan = "NO"
            decision_badge = "NOT_RECOMMENDED"
            headline = "NO — DO NOT GIVE LOAN (HIGH DEFAULT RISK)"

            if previous_history == "defaulted":
                reasons.append("Applicant has a documented previous loan default record on institutional credit files.")
            if operating_surplus < 0:
                reasons.append(f"Farming operations run at an estimated seasonal deficit of ₹{abs(operating_surplus):,.2f}. Cultivation expenses exceed expected harvest revenue.")
            if dscr is not None and dscr < 1.0:
                reasons.append(f"Debt Service Coverage Ratio (DSCR) is {dscr:.2f}x (below the 1.00x insolvency threshold). Projected agricultural cash flows cannot service combined debt.")
            if max_supportable <= 0 and operating_surplus >= 0:
                reasons.append("Existing debt obligations already exhaust all operational cash surplus, leaving zero supportable borrowing headroom.")
            if ml_risk == "ELEVATED_RISK":
                reasons.append("Exploratory ML repayment risk pipeline flagged elevated risk of default.")

            verdict_summary = f"NO — Lending institution is NOT advised to sanction this loan. Projected agricultural cash flows cannot safely service the requested ₹{requested_loan:,.2f} debt."

        elif (
            cf_verdict == "ASSESSMENT_SUPPORTIVE"
            and dscr is not None
            and dscr >= 1.25
            and operating_surplus > 0
            and max_supportable >= requested_loan
            and ml_risk != "ELEVATED_RISK"
            and previous_history != "defaulted"
        ):
            can_give_loan = "YES"
            decision_badge = "ELIGIBLE"
            headline = "YES — ELIGIBLE FOR LOAN SANCTION"

            reasons.append(f"Debt Service Coverage Ratio (DSCR) is {dscr:.2f}x, comfortably exceeding the institutional safety benchmark of 1.25x.")
            reasons.append(f"Farming operations generate a robust seasonal operating surplus of ₹{operating_surplus:,.2f} after all crop input costs.")
            reasons.append(f"Financially supportable loan capacity is ₹{max_supportable:,.2f}, providing a surplus debt headroom of ₹{surplus_or_shortfall:,.2f} above the requested amount.")

            if ml_risk == "LOW_RISK":
                prob_str = f" with {ml_prob * 100:.1f}% estimated distress probability" if ml_prob is not None else ""
                reasons.append(f"ML risk assessment categorized borrower in the LOW_RISK tier{prob_str}.")
            if other_income > 0:
                reasons.append(f"Verified non-farm income (₹{other_income:,.2f}/season) offers additional repayment buffer against agricultural market shocks.")

            verdict_summary = f"YES — Loan can be sanctioned. The applicant demonstrates adequate agricultural cash flow to comfortably service the requested ₹{requested_loan:,.2f} loan under standard terms."

        else:
            can_give_loan = "CONDITIONAL"
            decision_badge = "CONDITIONAL_SANCTION"
            headline = "CONDITIONAL — CAN SANCTION WITH REDUCED LIMIT / COVENANTS"

            if max_supportable < requested_loan:
                reasons.append(f"Requested loan amount (₹{requested_loan:,.2f}) exceeds supportable debt capacity (₹{max_supportable:,.2f}) by ₹{abs(surplus_or_shortfall):,.2f}.")
                conditions.append(f"Sanction reduced principal limit of up to ₹{max_supportable:,.2f} (instead of requested ₹{requested_loan:,.2f}).")

            if dscr is not None and 1.0 <= dscr < 1.25:
                reasons.append(f"DSCR of {dscr:.2f}x indicates narrow debt-servicing headroom against adverse weather or price volatility.")
                conditions.append("Require crop insurance cover (PMFBY) or credit co-guarantor.")

            if ml_risk == "ELEVATED_RISK":
                reasons.append("ML repayment risk model flagged elevated risk based on leverage or crop history.")
                conditions.append("Mandatory physical field verification by agricultural officer prior to disbursement.")

            if requested_loan > (cultivation_cost * 2.0) and requested_loan > 200000.0:
                reasons.append(f"Requested loan (₹{requested_loan:,.2f}) is significantly higher than direct cultivation costs (₹{cultivation_cost:,.2f}).")
                conditions.append("Verify capital expenditure quotations/invoices for farm machinery or irrigation equipment.")

            if missing_documents:
                for doc in missing_documents[:2]:
                    conditions.append(f"Obtain and verify: {doc}")

            verdict_summary = f"CONDITIONAL — Full requested loan of ₹{requested_loan:,.2f} carries elevated exposure, but the applicant can support up to ₹{max_supportable:,.2f} subject to field verification and agreed covenants."

        return {
            "can_give_loan": can_give_loan,
            "decision_badge": decision_badge,
            "headline": headline,
            "requested_loan_amount": requested_loan,
            "max_recommended_loan_amount": max_supportable,
            "surplus_or_shortfall_amount": surplus_or_shortfall,
            "dscr": dscr,
            "target_dscr_benchmark": 1.25,
            "verdict_summary": verdict_summary,
            "reasons": reasons,
            "conditions": conditions,
        }
