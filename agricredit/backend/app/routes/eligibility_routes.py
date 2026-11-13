"""
Agricultural Loan Eligibility Prediction Route
Endpoint: POST /api/agricredit/predict-eligibility
"""
from flask import Blueprint, request, jsonify
from app.services.eligibility_service import (
    AgriculturalLoanEligibilityService,
    eligibility_service,
)

eligibility_bp = Blueprint("eligibility_bp", __name__)

@eligibility_bp.route("/predict-eligibility", methods=["POST"])
def predict_eligibility():
    """
    Accepts 6 essential agronomic and risk indicators and returns
    a transparent, preliminary agricultural loan eligibility prediction.
    """
    try:
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({
                "success": false,
                "error": "Invalid or missing JSON payload in request body.",
                "field_errors": {"_general": "Request body must be a valid JSON object."},
            }), 400

        # Validate inputs
        is_valid, errors, cleaned = AgriculturalLoanEligibilityService.validate_inputs(data)
        if not is_valid:
            # Pick first error as top-level message for convenience
            first_err = next(iter(errors.values())) if errors else "Validation failed."
            return jsonify({
                "success": False,
                "error": first_err,
                "field_errors": errors,
            }), 400

        # Perform eligibility evaluation
        result = eligibility_service.assess_eligibility(cleaned)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"An unexpected server error occurred: {str(e)}",
            "code": "SERVER_ERROR",
        }), 500
