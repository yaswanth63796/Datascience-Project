import uuid
from datetime import datetime, timezone
from app.extensions import db

def utc_now():
    return datetime.now(timezone.utc)

class Farmer(db.Model):
    __tablename__ = "farmers"

    id = db.Column(db.Integer, primary_key=True)
    reference_id = db.Column(db.String(36), unique=True, nullable=False, index=True)
    farmer_name = db.Column(db.String(150), nullable=False, index=True)
    district = db.Column(db.String(100), nullable=False, index=True)
    state = db.Column(db.String(100), nullable=False, index=True)
    contact_number = db.Column(db.String(30), nullable=True)
    farming_experience_years = db.Column(db.Integer, nullable=False, default=1)
    land_ownership = db.Column(db.String(50), nullable=False, default="owned")  # 'owned', 'leased', 'mixed'
    total_landholding_acres = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    cultivated_land_current_season_acres = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    applications = db.relationship("LoanApplication", backref="farmer", lazy=True, cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super(Farmer, self).__init__(**kwargs)
        if not self.reference_id:
            self.reference_id = f"FARM-{uuid.uuid4().hex[:8].upper()}"

    def to_dict(self):
        return {
            "id": self.id,
            "reference_id": self.reference_id,
            "farmer_name": self.farmer_name,
            "district": self.district,
            "state": self.state,
            "contact_number": self.contact_number,
            "farming_experience_years": self.farming_experience_years,
            "land_ownership": self.land_ownership,
            "total_landholding_acres": float(self.total_landholding_acres) if self.total_landholding_acres is not None else 0.0,
            "cultivated_land_current_season_acres": float(self.cultivated_land_current_season_acres) if self.cultivated_land_current_season_acres is not None else 0.0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
