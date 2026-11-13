from datetime import datetime, timezone
from app.extensions import db

def utc_now():
    return datetime.now(timezone.utc)

class AssessmentHistory(db.Model):
    __tablename__ = "assessment_histories"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)

    action = db.Column(db.String(100), nullable=False)
    performed_by = db.Column(db.String(100), nullable=False, default="System")
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "action": self.action,
            "performed_by": self.performed_by,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
