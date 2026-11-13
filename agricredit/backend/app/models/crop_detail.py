from app.extensions import db

class CropDetail(db.Model):
    __tablename__ = "crop_details"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)

    crop_name = db.Column(db.String(100), nullable=False)
    season = db.Column(db.String(50), nullable=False)  # 'Kharif', 'Rabi', 'Zaid', 'Perennial'
    cultivated_area_acres = db.Column(db.Numeric(10, 2), nullable=False)
    expected_yield_per_acre = db.Column(db.Numeric(10, 2), nullable=False)
    yield_unit = db.Column(db.String(30), nullable=False, default="Quintal")  # Quintal, Ton, Kg, Bags
    expected_price_per_yield_unit = db.Column(db.Numeric(12, 2), nullable=False)

    # Cost breakdown per season/crop
    seed_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    fertilizer_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    pesticide_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    labour_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    irrigation_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    machinery_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    other_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0.0)
    cycles_count = db.Column(db.Integer, nullable=False, default=1)

    @property
    def gross_revenue(self) -> float:
        area = float(self.cultivated_area_acres or 0.0)
        yield_val = float(self.expected_yield_per_acre or 0.0)
        price = float(self.expected_price_per_yield_unit or 0.0)
        cycles = max(1, int(self.cycles_count or 1))
        return round(area * yield_val * price * cycles, 2)

    @property
    def total_cultivation_cost(self) -> float:
        cost = (
            float(self.seed_cost or 0.0)
            + float(self.fertilizer_cost or 0.0)
            + float(self.pesticide_cost or 0.0)
            + float(self.labour_cost or 0.0)
            + float(self.irrigation_cost or 0.0)
            + float(self.machinery_cost or 0.0)
            + float(self.other_cost or 0.0)
        )
        cycles = max(1, int(self.cycles_count or 1))
        return round(cost * cycles, 2)

    @property
    def estimated_crop_surplus(self) -> float:
        return round(self.gross_revenue - self.total_cultivation_cost, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "crop_name": self.crop_name,
            "season": self.season,
            "cultivated_area_acres": float(self.cultivated_area_acres) if self.cultivated_area_acres is not None else 0.0,
            "expected_yield_per_acre": float(self.expected_yield_per_acre) if self.expected_yield_per_acre is not None else 0.0,
            "yield_unit": self.yield_unit,
            "expected_price_per_yield_unit": float(self.expected_price_per_yield_unit) if self.expected_price_per_yield_unit is not None else 0.0,
            "seed_cost": float(self.seed_cost) if self.seed_cost is not None else 0.0,
            "fertilizer_cost": float(self.fertilizer_cost) if self.fertilizer_cost is not None else 0.0,
            "pesticide_cost": float(self.pesticide_cost) if self.pesticide_cost is not None else 0.0,
            "labour_cost": float(self.labour_cost) if self.labour_cost is not None else 0.0,
            "irrigation_cost": float(self.irrigation_cost) if self.irrigation_cost is not None else 0.0,
            "machinery_cost": float(self.machinery_cost) if self.machinery_cost is not None else 0.0,
            "other_cost": float(self.other_cost) if self.other_cost is not None else 0.0,
            "cycles_count": self.cycles_count,
            "gross_revenue": self.gross_revenue,
            "total_cultivation_cost": self.total_cultivation_cost,
            "estimated_crop_surplus": self.estimated_crop_surplus,
        }
