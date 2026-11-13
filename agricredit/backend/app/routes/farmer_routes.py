"""
Farmer Management Routes
Endpoints: /api/farmers, /api/farmers/<id>
"""
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.farmer import Farmer

farmer_bp = Blueprint("farmer_bp", __name__)

@farmer_bp.route("", methods=["POST"])
def create_farmer():
    data = request.get_json() or {}

    farmer_name = data.get("farmer_name", "").strip()
    district = data.get("district", "").strip()
    state = data.get("state", "").strip()

    if not farmer_name or not district or not state:
        return jsonify({"error": "Farmer name, district, and state are required."}), 400

    try:
        farmer = Farmer(
            farmer_name=farmer_name,
            district=district,
            state=state,
            contact_number=data.get("contact_number", ""),
            farming_experience_years=int(data.get("farming_experience_years", 1)),
            land_ownership=data.get("land_ownership", "owned"),
            total_landholding_acres=float(data.get("total_landholding_acres", 0.0)),
            cultivated_land_current_season_acres=float(data.get("cultivated_land_current_season_acres", 0.0)),
        )
        db.session.add(farmer)
        db.session.commit()

        return jsonify({"message": "Farmer profile created successfully.", "farmer": farmer.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create farmer profile: {str(e)}"}), 500

@farmer_bp.route("/<int:farmer_id>", methods=["GET"])
def get_farmer(farmer_id: int):
    farmer = db.session.get(Farmer, farmer_id)
    if not farmer:
        return jsonify({"error": "Farmer not found."}), 404
    return jsonify({"farmer": farmer.to_dict()}), 200

@farmer_bp.route("", methods=["GET"])
def list_farmers():
    farmers = Farmer.query.order_by(Farmer.created_at.desc()).limit(50).all()
    return jsonify({"farmers": [f.to_dict() for f in farmers]}), 200
