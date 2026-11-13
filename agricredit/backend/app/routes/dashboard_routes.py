"""
Dashboard Statistics and Aggregations Routes
Endpoint: GET /api/dashboard/summary
Calculates live database aggregates across applications, crops, subsidies, and assessments.
"""
from flask import Blueprint, jsonify
from sqlalchemy import func
from app.extensions import db
from app.models.application import LoanApplication
from app.models.crop_detail import CropDetail
from app.models.assessment import CashFlowAssessment, MLAssessment
from app.models.farmer import Farmer

dashboard_bp = Blueprint("dashboard_bp", __name__)

@dashboard_bp.route("/summary", methods=["GET"])
def get_dashboard_summary():
    total_apps = LoanApplication.query.count()
    
    # Status distributions
    status_counts = (
        db.session.query(LoanApplication.status, func.count(LoanApplication.id))
        .group_by(LoanApplication.status)
        .all()
    )
    status_map = {s: count for s, count in status_counts}

    awaiting_review = status_map.get("SUBMITTED", 0) + status_map.get("AWAITING_REVIEW", 0)
    reviewed_supportive = status_map.get("REVIEWED_SUPPORTIVE", 0)
    reviewed_rejected = status_map.get("REVIEWED_REJECTED", 0)
    info_requested = status_map.get("INFORMATION_REQUESTED", 0)
    assessed_count = status_map.get("ASSESSED", 0)

    # Completed assessments: either assessed or human-reviewed
    completed_assessments = (
        db.session.query(CashFlowAssessment).count()
    )

    # Insufficient information count
    insufficient_info = (
        db.session.query(CashFlowAssessment)
        .filter(CashFlowAssessment.cashflow_verdict == "INSUFFICIENT_DATA")
        .count()
    )

    # Financial aggregates
    financials = db.session.query(
        func.coalesce(func.sum(LoanApplication.requested_loan_amount), 0),
        func.coalesce(func.sum(LoanApplication.subsidy_received), 0),
        func.coalesce(func.sum(LoanApplication.subsidy_pending_approved), 0),
    ).first()

    total_requested = float(financials[0])
    total_subsidy_received = float(financials[1])
    total_subsidy_pending = float(financials[2])

    # Crop-wise distribution
    crop_stats = (
        db.session.query(
            CropDetail.crop_name,
            func.count(CropDetail.id).label("entry_count"),
            func.coalesce(func.sum(CropDetail.cultivated_area_acres), 0).label("total_acres"),
        )
        .group_by(CropDetail.crop_name)
        .order_by(func.sum(CropDetail.cultivated_area_acres).desc())
        .limit(8)
        .all()
    )
    crops_summary = [
        {"crop_name": c[0], "count": c[1], "total_acres": round(float(c[2]), 2)}
        for c in crop_stats
    ]

    # Season-wise distribution
    season_stats = (
        db.session.query(
            CropDetail.season,
            func.count(CropDetail.id).label("entry_count"),
            func.coalesce(func.sum(CropDetail.cultivated_area_acres), 0).label("total_acres"),
        )
        .group_by(CropDetail.season)
        .all()
    )
    seasons_summary = [
        {"season": s[0], "count": s[1], "total_acres": round(float(s[2]), 2)}
        for s in season_stats
    ]

    # Risk class distribution from MLAssessment
    risk_stats = (
        db.session.query(MLAssessment.predicted_risk_class, func.count(MLAssessment.id))
        .group_by(MLAssessment.predicted_risk_class)
        .all()
    )
    risk_map = {r[0]: r[1] for r in risk_stats}

    # Recent applications (latest 10)
    recent_apps = (
        LoanApplication.query.join(Farmer)
        .order_by(LoanApplication.created_at.desc())
        .limit(10)
        .all()
    )

    return jsonify({
        "metrics": {
            "total_submitted_applications": total_apps,
            "awaiting_review": awaiting_review,
            "completed_assessments": completed_assessments,
            "insufficient_information": insufficient_info,
            "aggregate_requested_loan_amount": total_requested,
            "total_subsidy_received": total_subsidy_received,
            "total_subsidy_pending_approved": total_subsidy_pending,
            "reviewed_supportive": reviewed_supportive,
            "reviewed_rejected": reviewed_rejected,
            "information_requested": info_requested,
            "assessed_pending_officer_action": assessed_count,
        },
        "status_distribution": [
            {"status": s, "count": c} for s, c in status_counts
        ],
        "risk_distribution": [
            {"risk_class": k, "count": v} for k, v in risk_map.items()
        ],
        "crops_summary": crops_summary,
        "seasons_summary": seasons_summary,
        "recent_applications": [a.to_dict(include_relations=True) for a in recent_apps],
    }), 200
