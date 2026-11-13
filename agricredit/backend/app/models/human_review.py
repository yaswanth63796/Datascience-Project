from datetime import datetime, timezone
from app.extensions import db

def utc_now():
    return datetime.now(timezone.utc)

class HumanReview(db.Model):
    __tablename__ = "human_reviews"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    admin_user_id = db.Column(db.Integer, db.ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)

    officer_name = db.Column(db.String(120), nullable=False)
    review_decision = db.Column(db.String(50), nullable=False)  # 'SUPPORTED', 'REJECTED', 'ADDITIONAL_DOCS_REQUESTED', 'NOTE_ADDED'
    recommended_loan_amount = db.Column(db.Numeric(12, 2), nullable=True)  # Separately tracked lender recommendation
    officer_notes = db.Column(db.Text, nullable=False)
    requested_additional_information = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "admin_user_id": self.admin_user_id,
            "officer_name": self.officer_name,
            "review_decision": self.review_decision,
            "recommended_loan_amount": float(self.recommended_loan_amount) if self.recommended_loan_amount is not None else None,
            "officer_notes": self.officer_notes,
            "requested_additional_information": self.requested_additional_information,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
