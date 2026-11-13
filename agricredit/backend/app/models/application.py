import uuid
from datetime import datetime, timezone
from app.extensions import db

def utc_now():
    return datetime.now(timezone.utc)

class LoanApplication(db.Model):
    __tablename__ = "loan_applications"

    id = db.Column(db.Integer, primary_key=True)
    application_number = db.Column(db.String(36), unique=True, nullable=False, index=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False, index=True)

    # Loan terms
    requested_loan_amount = db.Column(db.Numeric(12, 2), nullable=False)
    loan_purpose = db.Column(db.String(100), nullable=False, default="crop_cultivation")
    requested_loan_tenure_months = db.Column(db.Integer, nullable=False, default=12)
    repayment_frequency = db.Column(db.String(50), nullable=False, default="seasonal")  # 'seasonal', 'monthly', 'harvest_bullet'
    
    # Financial obligations & history
    previous_loan_history = db.Column(db.String(50), nullable=False, default="first_time_borrower")  # 'clean', 'minor_delay', 'defaulted', 'first_time_borrower'
    existing_outstanding_debt = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    existing_periodic_repayment = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    
    # Non-farm income & Subsidies
    other_verified_annual_income = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    subsidy_scheme_name = db.Column(db.String(150), nullable=True)
    subsidy_received = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    subsidy_pending_approved = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    subsidy_applied_unapproved = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    subsidy_reference_evidence = db.Column(db.String(255), nullable=True)
    expected_harvest_month = db.Column(db.String(50), nullable=True)

    # Workflow status
    status = db.Column(db.String(50), nullable=False, default="SUBMITTED", index=True)
    # Statuses: 'SUBMITTED', 'AWAITING_REVIEW', 'INFORMATION_REQUESTED', 'ASSESSED', 'REVIEWED_SUPPORTIVE', 'REVIEWED_REJECTED', 'CONDITIONALLY_APPROVED'

    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    crops = db.relationship("CropDetail", backref="application", lazy=True, cascade="all, delete-orphan")
    documents = db.relationship("SupportingDocument", backref="application", lazy=True, cascade="all, delete-orphan")
    cashflow_assessment = db.relationship("CashFlowAssessment", backref="application", uselist=False, cascade="all, delete-orphan")
    ml_assessment = db.relationship("MLAssessment", backref="application", uselist=False, cascade="all, delete-orphan")
    human_reviews = db.relationship("HumanReview", backref="application", lazy=True, cascade="all, delete-orphan", order_by="HumanReview.created_at.desc()")
    history_entries = db.relationship("AssessmentHistory", backref="application", lazy=True, cascade="all, delete-orphan", order_by="AssessmentHistory.created_at.desc()")

    def __init__(self, **kwargs):
        super(LoanApplication, self).__init__(**kwargs)
        if not self.application_number:
            year = datetime.now(timezone.utc).year
            self.application_number = f"AGRI-{year}-{uuid.uuid4().hex[:6].upper()}"

    def to_dict(self, include_relations=True):
        data = {
            "id": self.id,
            "application_number": self.application_number,
            "farmer_id": self.farmer_id,
            "requested_loan_amount": float(self.requested_loan_amount) if self.requested_loan_amount is not None else 0.0,
            "loan_purpose": self.loan_purpose,
            "requested_loan_tenure_months": self.requested_loan_tenure_months,
            "repayment_frequency": self.repayment_frequency,
            "previous_loan_history": self.previous_loan_history,
            "existing_outstanding_debt": float(self.existing_outstanding_debt) if self.existing_outstanding_debt is not None else 0.0,
            "existing_periodic_repayment": float(self.existing_periodic_repayment) if self.existing_periodic_repayment is not None else 0.0,
            "other_verified_annual_income": float(self.other_verified_annual_income) if self.other_verified_annual_income is not None else 0.0,
            "subsidy_scheme_name": self.subsidy_scheme_name,
            "subsidy_received": float(self.subsidy_received) if self.subsidy_received is not None else 0.0,
            "subsidy_pending_approved": float(self.subsidy_pending_approved) if self.subsidy_pending_approved is not None else 0.0,
            "subsidy_applied_unapproved": float(self.subsidy_applied_unapproved) if self.subsidy_applied_unapproved is not None else 0.0,
            "subsidy_reference_evidence": self.subsidy_reference_evidence,
            "expected_harvest_month": self.expected_harvest_month,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_relations:
            if self.farmer:
                data["farmer"] = self.farmer.to_dict()
            data["crops"] = [c.to_dict() for c in self.crops]
            data["documents"] = [d.to_dict() for d in self.documents]
            cf_dict = self.cashflow_assessment.to_dict() if self.cashflow_assessment else None
            ml_dict = self.ml_assessment.to_dict() if self.ml_assessment else None
            data["cashflow_assessment"] = cf_dict
            data["ml_assessment"] = ml_dict
            data["human_reviews"] = [r.to_dict() for r in self.human_reviews]
            data["history_entries"] = [h.to_dict() for h in self.history_entries]

            if cf_dict:
                from app.services.assessment_service import AssessmentService
                data["loan_decision"] = AssessmentService.compute_loan_decision(
                    application_data=data,
                    farmer_data=data.get("farmer"),
                    cashflow_dict=cf_dict,
                    ml_dict=ml_dict,
                )
            else:
                data["loan_decision"] = None

        return data
