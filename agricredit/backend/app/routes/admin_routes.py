"""
Administrator and Loan Officer Workflow Routes
Endpoints: /api/admin/applications/<id>/review, /api/admin/applications/<id>/request-information, /api/admin/seed-demo-data
"""
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.admin_user import AdminUser
from app.models.application import LoanApplication
from app.models.farmer import Farmer
from app.models.crop_detail import CropDetail
from app.models.human_review import HumanReview
from app.models.history import AssessmentHistory
from app.services.assessment_service import AssessmentService
from app.utils.auth import login_required

admin_bp = Blueprint("admin_bp", __name__)

@admin_bp.route("/applications/<int:app_id>/review", methods=["POST"])
@login_required
def submit_human_review(app_id: int):
    app_record = db.session.get(LoanApplication, app_id)
    if not app_record:
        return jsonify({"error": "Application not found."}), 404

    current_user = getattr(request, "current_user", None)
    data = request.get_json() or {}

    decision = data.get("review_decision", "").upper()
    if decision not in ["SUPPORTED", "REJECTED", "ADDITIONAL_DOCS_REQUESTED", "NOTE_ADDED"]:
        return jsonify({"error": "Invalid review decision. Must be SUPPORTED, REJECTED, ADDITIONAL_DOCS_REQUESTED, or NOTE_ADDED."}), 400

    officer_notes = data.get("officer_notes", "").strip()
    if not officer_notes:
        return jsonify({"error": "Officer notes are required for human audit."}), 400

    recommended_amount = data.get("recommended_loan_amount")
    if recommended_amount is not None:
        recommended_amount = float(recommended_amount)

    officer_name = data.get("officer_name") or (current_user.full_name if current_user else "Agricultural Credit Officer")

    review = HumanReview(
        application_id=app_record.id,
        admin_user_id=current_user.id if current_user else None,
        officer_name=officer_name,
        review_decision=decision,
        recommended_loan_amount=recommended_amount,
        officer_notes=officer_notes,
        requested_additional_information=data.get("requested_additional_information", ""),
    )
    db.session.add(review)

    # Update application status based on human decision
    if decision == "SUPPORTED":
        app_record.status = "REVIEWED_SUPPORTIVE"
    elif decision == "REJECTED":
        app_record.status = "REVIEWED_REJECTED"
    elif decision == "ADDITIONAL_DOCS_REQUESTED":
        app_record.status = "INFORMATION_REQUESTED"

    history = AssessmentHistory(
        application_id=app_record.id,
        action=f"HUMAN_REVIEW_{decision}",
        performed_by=officer_name,
        details=f"Human Decision: {decision}. Notes: {officer_notes[:120]}...",
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({
        "message": "Human review recorded successfully.",
        "review": review.to_dict(),
        "application_status": app_record.status,
    }), 200

@admin_bp.route("/applications/<int:app_id>/request-information", methods=["POST"])
@login_required
def request_information(app_id: int):
    app_record = db.session.get(LoanApplication, app_id)
    if not app_record:
        return jsonify({"error": "Application not found."}), 404

    current_user = getattr(request, "current_user", None)
    data = request.get_json() or {}
    items = data.get("requested_items", "").strip()
    if not items:
        return jsonify({"error": "Please describe the information or documents requested."}), 400

    officer_name = current_user.full_name if current_user else "Loan Officer"

    review = HumanReview(
        application_id=app_record.id,
        admin_user_id=current_user.id if current_user else None,
        officer_name=officer_name,
        review_decision="ADDITIONAL_DOCS_REQUESTED",
        officer_notes=f"Information Request Sent: {items}",
        requested_additional_information=items,
    )
    db.session.add(review)
    app_record.status = "INFORMATION_REQUESTED"

    history = AssessmentHistory(
        application_id=app_record.id,
        action="ADDITIONAL_INFORMATION_REQUESTED",
        performed_by=officer_name,
        details=f"Requested: {items}",
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({"message": "Information request logged and applicant status updated."}), 200

@admin_bp.route("/setup-admin", methods=["POST"])
def setup_initial_admin():
    """
    Initializes default administrator account if none exists.
    """
    data = request.get_json() or {}
    username = data.get("username", "admin").strip()
    password = data.get("password", "AgriAdmin@2026")
    email = data.get("email", "admin@agricredit.internal").strip()
    full_name = data.get("full_name", "Lead Credit Officer").strip()

    existing = AdminUser.query.filter_by(username=username).first()
    if existing:
        return jsonify({"message": "Admin user already exists.", "user": existing.to_dict()}), 200

    admin = AdminUser(username=username, email=email, role="admin", full_name=full_name)
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()

    return jsonify({"message": "Initial administrator account created.", "user": admin.to_dict()}), 201

@admin_bp.route("/seed-demo-data", methods=["POST"])
def seed_demo_applications():
    """
    Seeds diverse agricultural loan applications for rich frontend demonstration.
    """
    demo_profiles = [
        {
            "farmer": {
                "farmer_name": "Ramesh Chandra Patel",
                "district": "Anand",
                "state": "Gujarat",
                "contact_number": "+91 98250 11234",
                "farming_experience_years": 18,
                "land_ownership": "owned",
                "total_landholding_acres": 6.5,
                "cultivated_land_current_season_acres": 6.0,
            },
            "application": {
                "requested_loan_amount": 160000.0,
                "loan_purpose": "crop_cultivation",
                "requested_loan_tenure_months": 12,
                "repayment_frequency": "seasonal",
                "previous_loan_history": "clean",
                "existing_outstanding_debt": 35000.0,
                "existing_periodic_repayment": 7000.0,
                "other_verified_annual_income": 45000.0,
                "subsidy_scheme_name": "PM-KISAN",
                "subsidy_received": 6000.0,
                "subsidy_pending_approved": 0.0,
                "subsidy_applied_unapproved": 0.0,
                "expected_harvest_month": "November",
            },
            "crops": [
                {
                    "crop_name": "Cotton",
                    "season": "Kharif",
                    "cultivated_area_acres": 4.0,
                    "expected_yield_per_acre": 9.5,
                    "yield_unit": "Quintal",
                    "expected_price_per_yield_unit": 6800.0,
                    "seed_cost": 16000.0,
                    "fertilizer_cost": 22000.0,
                    "pesticide_cost": 14000.0,
                    "labour_cost": 28000.0,
                    "irrigation_cost": 12000.0,
                    "machinery_cost": 15000.0,
                    "other_cost": 6000.0,
                },
                {
                    "crop_name": "Groundnut",
                    "season": "Kharif",
                    "cultivated_area_acres": 2.0,
                    "expected_yield_per_acre": 11.0,
                    "yield_unit": "Quintal",
                    "expected_price_per_yield_unit": 5600.0,
                    "seed_cost": 10000.0,
                    "fertilizer_cost": 8000.0,
                    "pesticide_cost": 5000.0,
                    "labour_cost": 12000.0,
                    "irrigation_cost": 6000.0,
                    "machinery_cost": 8000.0,
                    "other_cost": 3000.0,
                },
            ],
        },
        {
            "farmer": {
                "farmer_name": "Gurpreet Singh Gill",
                "district": "Ludhiana",
                "state": "Punjab",
                "contact_number": "+91 94170 55432",
                "farming_experience_years": 24,
                "land_ownership": "owned",
                "total_landholding_acres": 12.0,
                "cultivated_land_current_season_acres": 12.0,
            },
            "application": {
                "requested_loan_amount": 280000.0,
                "loan_purpose": "fertilizer",
                "requested_loan_tenure_months": 12,
                "repayment_frequency": "seasonal",
                "previous_loan_history": "clean",
                "existing_outstanding_debt": 0.0,
                "existing_periodic_repayment": 0.0,
                "other_verified_annual_income": 80000.0,
                "subsidy_scheme_name": "Sub-Mission on Agricultural Mechanization",
                "subsidy_received": 18000.0,
                "subsidy_pending_approved": 25000.0,
                "subsidy_applied_unapproved": 0.0,
                "expected_harvest_month": "April",
            },
            "crops": [
                {
                    "crop_name": "Wheat",
                    "season": "Rabi",
                    "cultivated_area_acres": 12.0,
                    "expected_yield_per_acre": 21.0,
                    "yield_unit": "Quintal",
                    "expected_price_per_yield_unit": 2275.0,
                    "seed_cost": 24000.0,
                    "fertilizer_cost": 45000.0,
                    "pesticide_cost": 18000.0,
                    "labour_cost": 40000.0,
                    "irrigation_cost": 20000.0,
                    "machinery_cost": 36000.0,
                    "other_cost": 10000.0,
                }
            ],
        },
        {
            "farmer": {
                "farmer_name": "Mallikarjun Reddy",
                "district": "Kurnool",
                "state": "Andhra Pradesh",
                "contact_number": "+91 99480 33211",
                "farming_experience_years": 8,
                "land_ownership": "leased",
                "total_landholding_acres": 4.0,
                "cultivated_land_current_season_acres": 4.0,
            },
            "application": {
                "requested_loan_amount": 190000.0,
                "loan_purpose": "irrigation",
                "requested_loan_tenure_months": 18,
                "repayment_frequency": "seasonal",
                "previous_loan_history": "minor_delay",
                "existing_outstanding_debt": 110000.0,
                "existing_periodic_repayment": 22000.0,
                "other_verified_annual_income": 20000.0,
                "subsidy_scheme_name": "Micro Irrigation Subsidy",
                "subsidy_received": 0.0,
                "subsidy_pending_approved": 15000.0,
                "subsidy_applied_unapproved": 20000.0,
                "expected_harvest_month": "December",
            },
            "crops": [
                {
                    "crop_name": "Maize",
                    "season": "Kharif",
                    "cultivated_area_acres": 4.0,
                    "expected_yield_per_acre": 24.0,
                    "yield_unit": "Quintal",
                    "expected_price_per_yield_unit": 1850.0,
                    "seed_cost": 16000.0,
                    "fertilizer_cost": 20000.0,
                    "pesticide_cost": 12000.0,
                    "labour_cost": 26000.0,
                    "irrigation_cost": 18000.0,
                    "machinery_cost": 14000.0,
                    "other_cost": 6000.0,
                }
            ],
        },
    ]

    created_apps = []
    for demo in demo_profiles:
        farmer_obj = Farmer(**demo["farmer"])
        db.session.add(farmer_obj)
        db.session.flush()

        app_obj = LoanApplication(farmer_id=farmer_obj.id, **demo["application"])
        db.session.add(app_obj)
        db.session.flush()

        for c in demo["crops"]:
            crop_obj = CropDetail(application_id=app_obj.id, **c)
            db.session.add(crop_obj)

        db.session.commit()
        # Assess
        AssessmentService.run_full_assessment(app_obj.id)
        created_apps.append(app_obj.application_number)

    return jsonify({
        "message": f"Successfully seeded {len(created_apps)} demo applications with assessments.",
        "applications": created_apps,
    }), 201
