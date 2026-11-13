import json
from datetime import datetime, timezone
from app.extensions import db

def utc_now():
    return datetime.now(timezone.utc)

class CashFlowAssessment(db.Model):
    __tablename__ = "cashflow_assessments"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("loan_applications.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    total_seasonal_crop_revenue = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    total_seasonal_cultivation_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    estimated_agricultural_operating_surplus = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    
    verified_other_income_period = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    confirmed_subsidy_period = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    pending_subsidy_tracked = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)  # Tracked separately, NOT added as guaranteed cash
    
    existing_debt_service_period = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    proposed_loan_installment_monthly = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    proposed_debt_service_period = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    total_debt_service_period = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    
    estimated_net_available_cashflow = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    debt_service_coverage_ratio = db.Column(db.Numeric(6, 2), nullable=True)  # DSCR
    
    assumed_annual_interest_rate_pct = db.Column(db.Numeric(5, 2), nullable=False, default=7.0)
    cashflow_verdict = db.Column(db.String(50), nullable=False, default="MANUAL_REVIEW")  # 'ASSESSMENT_SUPPORTIVE', 'MANUAL_REVIEW', 'INSUFFICIENT_DATA'
    cashflow_notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    def to_dict(self):
        notes_parsed = []
        if self.cashflow_notes:
            try:
                notes_parsed = json.loads(self.cashflow_notes)
            except Exception:
                notes_parsed = [self.cashflow_notes]

        return {
            "id": self.id,
            "application_id": self.application_id,
            "total_seasonal_crop_revenue": float(self.total_seasonal_crop_revenue) if self.total_seasonal_crop_revenue is not None else 0.0,
            "total_seasonal_cultivation_cost": float(self.total_seasonal_cultivation_cost) if self.total_seasonal_cultivation_cost is not None else 0.0,
            "estimated_agricultural_operating_surplus": float(self.estimated_agricultural_operating_surplus) if self.estimated_agricultural_operating_surplus is not None else 0.0,
            "verified_other_income_period": float(self.verified_other_income_period) if self.verified_other_income_period is not None else 0.0,
            "confirmed_subsidy_period": float(self.confirmed_subsidy_period) if self.confirmed_subsidy_period is not None else 0.0,
            "pending_subsidy_tracked": float(self.pending_subsidy_tracked) if self.pending_subsidy_tracked is not None else 0.0,
            "existing_debt_service_period": float(self.existing_debt_service_period) if self.existing_debt_service_period is not None else 0.0,
            "proposed_loan_installment_monthly": float(self.proposed_loan_installment_monthly) if self.proposed_loan_installment_monthly is not None else 0.0,
            "proposed_debt_service_period": float(self.proposed_debt_service_period) if self.proposed_debt_service_period is not None else 0.0,
            "total_debt_service_period": float(self.total_debt_service_period) if self.total_debt_service_period is not None else 0.0,
            "estimated_net_available_cashflow": float(self.estimated_net_available_cashflow) if self.estimated_net_available_cashflow is not None else 0.0,
            "debt_service_coverage_ratio": float(self.debt_service_coverage_ratio) if self.debt_service_coverage_ratio is not None else None,
            "assumed_annual_interest_rate_pct": float(self.assumed_annual_interest_rate_pct) if self.assumed_annual_interest_rate_pct is not None else 7.0,
            "cashflow_verdict": self.cashflow_verdict,
            "cashflow_notes": notes_parsed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MLAssessment(db.Model):
    __tablename__ = "ml_assessments"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("loan_applications.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    predicted_risk_class = db.Column(db.String(50), nullable=False, default="MODERATE_RISK")  # 'LOW_RISK', 'MODERATE_RISK', 'ELEVATED_RISK'
    repayment_difficulty_probability = db.Column(db.Float, nullable=True)
    model_version = db.Column(db.String(50), nullable=False, default="v1.0-synthetic-rf")
    model_name = db.Column(db.String(100), nullable=False, default="Agricultural Repayment Risk Random Forest")
    is_fallback = db.Column(db.Boolean, nullable=False, default=False)
    fallback_reason = db.Column(db.String(255), nullable=True)
    key_contributing_factors = db.Column(db.Text, nullable=True)  # JSON formatted factors
    limitations_disclaimer = db.Column(
        db.Text,
        nullable=False,
        default="Model trained on empirical agricultural economics synthetic dataset due to banking privacy restrictions on individual farmer loan NPA records. Output is an exploratory risk indicator and not a bank credit decision.",
    )

    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    def to_dict(self):
        factors = []
        if self.key_contributing_factors:
            try:
                factors = json.loads(self.key_contributing_factors)
            except Exception:
                factors = [self.key_contributing_factors]

        return {
            "id": self.id,
            "application_id": self.application_id,
            "predicted_risk_class": self.predicted_risk_class,
            "repayment_difficulty_probability": round(self.repayment_difficulty_probability, 4) if self.repayment_difficulty_probability is not None else None,
            "model_version": self.model_version,
            "model_name": self.model_name,
            "is_fallback": self.is_fallback,
            "fallback_reason": self.fallback_reason,
            "key_contributing_factors": factors,
            "limitations_disclaimer": self.limitations_disclaimer,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
