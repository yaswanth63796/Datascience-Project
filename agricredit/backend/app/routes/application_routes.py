"""
Loan Application Management Routes
Endpoints: /api/applications, /api/applications/<id>, /api/applications/<id>/documents
"""
import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models.farmer import Farmer
from app.models.application import LoanApplication
from app.models.crop_detail import CropDetail
from app.models.supporting_document import SupportingDocument
from app.models.history import AssessmentHistory
from app.services.cashflow_service import CashFlowService
from app.services.assessment_service import AssessmentService

application_bp = Blueprint("application_bp", __name__)

def allowed_file(filename: str) -> bool:
    allowed = current_app.config.get("ALLOWED_EXTENSIONS", {"pdf", "png", "jpg", "jpeg", "csv", "txt"})
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed

@application_bp.route("", methods=["POST"])
def submit_application():
    data = request.get_json() or {}

    farmer_data = data.get("farmer", {})
    crops_data = data.get("crops", [])

    if not farmer_data.get("farmer_name") or not farmer_data.get("district") or not farmer_data.get("state"):
        return jsonify({"error": "Farmer name, district, and state are required."}), 400

    requested_amount = float(data.get("requested_loan_amount", 0.0))
    if requested_amount <= 0:
        return jsonify({"error": "Requested loan amount must be greater than zero."}), 400

    try:
        # 1. Create or link farmer
        farmer_id = data.get("farmer_id")
        if farmer_id:
            farmer = db.session.get(Farmer, farmer_id)
            if not farmer:
                return jsonify({"error": "Specified farmer ID does not exist."}), 404
        else:
            farmer = Farmer(
                farmer_name=farmer_data.get("farmer_name").strip(),
                district=farmer_data.get("district").strip(),
                state=farmer_data.get("state").strip(),
                contact_number=farmer_data.get("contact_number", ""),
                farming_experience_years=int(farmer_data.get("farming_experience_years", 1)),
                land_ownership=farmer_data.get("land_ownership", "owned"),
                total_landholding_acres=float(farmer_data.get("total_landholding_acres", 0.0)),
                cultivated_land_current_season_acres=float(farmer_data.get("cultivated_land_current_season_acres", 0.0)),
            )
            db.session.add(farmer)
            db.session.flush()

        # 2. Create LoanApplication
        app_record = LoanApplication(
            farmer_id=farmer.id,
            requested_loan_amount=requested_amount,
            loan_purpose=data.get("loan_purpose", "crop_cultivation"),
            requested_loan_tenure_months=int(data.get("requested_loan_tenure_months", 12)),
            repayment_frequency=data.get("repayment_frequency", "seasonal"),
            previous_loan_history=data.get("previous_loan_history", "first_time_borrower"),
            existing_outstanding_debt=float(data.get("existing_outstanding_debt", 0.0)),
            existing_periodic_repayment=float(data.get("existing_periodic_repayment", 0.0)),
            other_verified_annual_income=float(data.get("other_verified_annual_income", 0.0)),
            subsidy_scheme_name=data.get("subsidy_scheme_name", ""),
            subsidy_received=float(data.get("subsidy_received", 0.0)),
            subsidy_pending_approved=float(data.get("subsidy_pending_approved", 0.0)),
            subsidy_applied_unapproved=float(data.get("subsidy_applied_unapproved", 0.0)),
            subsidy_reference_evidence=data.get("subsidy_reference_evidence", ""),
            expected_harvest_month=data.get("expected_harvest_month", ""),
            status="SUBMITTED",
        )
        db.session.add(app_record)
        db.session.flush()

        # 3. Add CropDetails
        for crop in crops_data:
            crop_entry = CropDetail(
                application_id=app_record.id,
                crop_name=crop.get("crop_name", "Paddy"),
                season=crop.get("season", "Kharif"),
                cultivated_area_acres=float(crop.get("cultivated_area_acres", 0.0)),
                expected_yield_per_acre=float(crop.get("expected_yield_per_acre", 0.0)),
                yield_unit=crop.get("yield_unit", "Quintal"),
                expected_price_per_yield_unit=float(crop.get("expected_price_per_yield_unit", 0.0)),
                seed_cost=float(crop.get("seed_cost", 0.0)),
                fertilizer_cost=float(crop.get("fertilizer_cost", 0.0)),
                pesticide_cost=float(crop.get("pesticide_cost", 0.0)),
                labour_cost=float(crop.get("labour_cost", 0.0)),
                irrigation_cost=float(crop.get("irrigation_cost", 0.0)),
                machinery_cost=float(crop.get("machinery_cost", 0.0)),
                other_cost=float(crop.get("other_cost", 0.0)),
                cycles_count=int(crop.get("cycles_count", 1)),
            )
            db.session.add(crop_entry)

        # Audit History
        history = AssessmentHistory(
            application_id=app_record.id,
            action="APPLICATION_SUBMITTED",
            performed_by="Applicant / Farmer",
            details=f"Application registered for ₹{requested_amount:,.2f} with {len(crops_data)} crop entries.",
        )
        db.session.add(history)
        db.session.commit()

        # Run assessment immediately
        assessment_res = AssessmentService.run_full_assessment(app_record.id)

        return jsonify({
            "message": "Agricultural loan application submitted and assessed successfully.",
            "application": app_record.to_dict(),
            "assessment": assessment_res,
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to submit application: {str(e)}"}), 500

@application_bp.route("", methods=["GET"])
def list_applications():
    status = request.args.get("status")
    search = request.args.get("search", "").strip()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))

    query = LoanApplication.query.join(Farmer)

    if status and status != "ALL":
        query = query.filter(LoanApplication.status == status)

    if search:
        query = query.filter(
            db.or_(
                Farmer.farmer_name.ilike(f"%{search}%"),
                Farmer.district.ilike(f"%{search}%"),
                LoanApplication.application_number.ilike(f"%{search}%"),
            )
        )

    pagination = query.order_by(LoanApplication.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "applications": [a.to_dict() for a in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
    }), 200

@application_bp.route("/<int:app_id>", methods=["GET"])
def get_application(app_id: int):
    app_record = db.session.get(LoanApplication, app_id)
    if not app_record:
        return jsonify({"error": "Application not found."}), 404
    return jsonify({"application": app_record.to_dict()}), 200

@application_bp.route("/<int:app_id>/documents", methods=["POST"])
def upload_document(app_id: int):
    app_record = db.session.get(LoanApplication, app_id)
    if not app_record:
        return jsonify({"error": "Application not found."}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file payload in request."}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No selected file."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not supported. Allowed formats: PDF, PNG, JPG, JPEG, CSV, TXT."}), 400

    doc_type = request.form.get("document_type", "other")
    original_name = file.filename
    clean_name = secure_filename(original_name)
    stored_name = f"{uuid.uuid4().hex[:10]}_{clean_name}"

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)
    full_path = os.path.join(upload_folder, stored_name)

    file.save(full_path)
    file_size = os.path.getsize(full_path)
    mime_type = file.mimetype or "application/octet-stream"

    doc = SupportingDocument(
        application_id=app_record.id,
        document_type=doc_type,
        original_filename=original_name,
        stored_filename=stored_name,
        file_path=full_path,
        file_size_bytes=file_size,
        mime_type=mime_type,
        is_verified=False,
    )
    db.session.add(doc)

    history = AssessmentHistory(
        application_id=app_record.id,
        action="DOCUMENT_UPLOADED",
        performed_by="Applicant / Loan Officer",
        details=f"Uploaded evidence '{original_name}' classified as {doc_type}.",
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({"message": "Supporting document uploaded successfully.", "document": doc.to_dict()}), 201

@application_bp.route("/<int:app_id>/documents/<int:doc_id>/download", methods=["GET"])
def download_document(app_id: int, doc_id: int):
    doc = SupportingDocument.query.filter_by(id=doc_id, application_id=app_id).first()
    if not doc or not os.path.exists(doc.file_path):
        return jsonify({"error": "Document not found on storage."}), 404

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    return send_from_directory(upload_folder, doc.stored_filename, as_attachment=True, download_name=doc.original_filename)

@application_bp.route("/<int:app_id>/calculate-cashflow", methods=["POST"])
def preview_cashflow(app_id: int):
    app_record = db.session.get(LoanApplication, app_id)
    if not app_record:
        return jsonify({"error": "Application not found."}), 404

    data = request.get_json() or {}
    assumed_rate = float(data.get("assumed_interest_rate", current_app.config["DEFAULT_ASSUMED_INTEREST_RATE"]))

    res = CashFlowService.evaluate_agricultural_cashflow(
        farmer_data=app_record.farmer.to_dict(),
        application_data=app_record.to_dict(include_relations=False),
        crops_data=[c.to_dict() for c in app_record.crops],
        assumed_interest_rate=assumed_rate,
    )
    return jsonify({"cashflow_preview": res}), 200
