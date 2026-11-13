from datetime import datetime, timezone
from app.extensions import db

def utc_now():
    return datetime.now(timezone.utc)

class SupportingDocument(db.Model):
    __tablename__ = "supporting_documents"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)

    document_type = db.Column(db.String(50), nullable=False)  # 'land_record', 'crop_record', 'subsidy_receipt', 'repayment_record', 'other'
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size_bytes = db.Column(db.Integer, nullable=False, default=0)
    mime_type = db.Column(db.String(100), nullable=True)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    verification_notes = db.Column(db.String(255), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "document_type": self.document_type,
            "original_filename": self.original_filename,
            "file_size_bytes": self.file_size_bytes,
            "mime_type": self.mime_type,
            "is_verified": self.is_verified,
            "verification_notes": self.verification_notes,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }
