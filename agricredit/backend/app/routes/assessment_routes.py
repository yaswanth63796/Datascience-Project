"""
Assessment and Audit History Routes
Endpoints: /api/applications/<id>/assess, /api/applications/<id>/assessment, /api/applications/<id>/history
"""
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models.application import LoanApplication
from app.models.history import AssessmentHistory
from app.services.assessment_service import AssessmentService

assessment_bp = Blueprint("assessment_bp", __name__)

@assessment_bp.route("/<int:app_id>/assess", methods=["POST"])
def trigger_assessment(app_id: int):
    data = request.get_json() or {}
    assumed_rate = data.get("assumed_interest_rate")
    if assumed_rate is not None:
        assumed_rate = float(assumed_rate)
    else:
        assumed_rate = current_app.config["DEFAULT_ASSUMED_INTEREST_RATE"]

    try:
        result = AssessmentService.run_full_assessment(app_id, assumed_interest_rate=assumed_rate)
        return jsonify({"message": "Agricultural credit assessment generated.", "assessment": result}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Assessment execution failed: {str(e)}"}), 500

@assessment_bp.route("/<int:app_id>/assessment", methods=["GET"])
def get_assessment(app_id: int):
    app_record = db.session.get(LoanApplication, app_id)
    if not app_record:
        return jsonify({"error": "Application not found."}), 404

    cf = app_record.cashflow_assessment
    ml = app_record.ml_assessment

    if not cf and not ml:
        # Run on the fly
        try:
            result = AssessmentService.run_full_assessment(app_id)
            return jsonify({"assessment": result}), 200
        except Exception as e:
            return jsonify({"error": f"Could not generate assessment: {str(e)}"}), 500

    # Determine recommended next step
    cf_verdict = cf.cashflow_verdict if cf else "INSUFFICIENT_DATA"
    ml_class = ml.predicted_risk_class if ml else "MODERATE_RISK"

    if cf_verdict == "INSUFFICIENT_DATA":
        next_step = "INSUFFICIENT_DATA"
        reason = "Required agricultural revenue, crop acreage, or income parameters are incomplete."
    elif cf_verdict == "MANUAL_REVIEW" or ml_class == "ELEVATED_RISK":
        next_step = "MANUAL_REVIEW"
        reason = "Narrow debt service coverage or elevated risk indicator requires human officer review."
    else:
        next_step = "ASSESSMENT_SUPPORTIVE"
        reason = "Agricultural cash flow and risk profile appear supportive under assumed terms."

    missing_docs = []
    doc_types = {d.document_type for d in app_record.documents}
    if "land_record" not in doc_types:
        missing_docs.append("Land Ownership/Lease Agreement Record (Patta/Chitta/7-12 extract)")
    if "crop_record" not in doc_types:
        missing_docs.append("Seasonal Sowing / Crop Cultivation Certificate")
    if app_record.subsidy_received > 0 and "subsidy_receipt" not in doc_types:
        missing_docs.append("Government Subsidy Sanction Order or Bank Passbook Credit Entry")

    cf_dict = cf.to_dict() if cf else None
    ml_dict = ml.to_dict() if ml else None
    loan_decision = AssessmentService.compute_loan_decision(
        application_data=app_record.to_dict(include_relations=False),
        farmer_data=app_record.farmer.to_dict() if app_record.farmer else None,
        cashflow_dict=cf_dict,
        ml_dict=ml_dict,
        missing_documents=missing_docs,
    )

    return jsonify({
        "assessment": {
            "application_id": app_record.id,
            "application_number": app_record.application_number,
            "loan_decision": loan_decision,
            "cashflow_assessment": cf_dict,
            "ml_assessment": ml_dict,
            "recommended_next_step": next_step,
            "recommendation_reason": reason,
            "missing_documents": missing_docs,
            "disclaimer": (
                "AgriCredit is an agricultural loan decision-support prototype. "
                "Final credit sanctioning remains subject to formal human review and lender policy."
            ),
        }
    }), 200

@assessment_bp.route("/<int:app_id>/history", methods=["GET"])
def get_history(app_id: int):
    history_entries = (
        AssessmentHistory.query.filter_by(application_id=app_id)
        .order_by(AssessmentHistory.created_at.desc())
        .all()
    )
    return jsonify({"history": [h.to_dict() for h in history_entries]}), 200
