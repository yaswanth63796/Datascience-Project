"""
AgriCredit Exploratory Data Analysis (EDA) Routes
Endpoints:
- GET /api/eda/overview
- GET /api/eda/distributions
- GET /api/eda/correlation
- GET /api/eda/missing-values
- GET /api/eda/numerical-summary
- GET /api/eda/filters
"""
from flask import Blueprint, request, jsonify
from app.services.eda_service import EdaService

eda_bp = Blueprint("eda_bp", __name__)


@eda_bp.route("/overview", methods=["GET"])
def get_eda_overview():
    source = request.args.get("source", "benchmark")
    crop = request.args.get("crop", None)
    season = request.args.get("season", None)

    try:
        overview = EdaService.get_overview(source=source, crop=crop, season=season)
        return jsonify(overview), 200
    except Exception as e:
        return jsonify({"error": f"Failed to calculate dataset overview: {str(e)}", "code": "EDA_ERROR"}), 500


@eda_bp.route("/distributions", methods=["GET"])
def get_eda_distributions():
    source = request.args.get("source", "benchmark")
    crop = request.args.get("crop", None)
    season = request.args.get("season", None)

    try:
        distributions = EdaService.get_distributions(source=source, crop=crop, season=season)
        return jsonify(distributions), 200
    except Exception as e:
        return jsonify({"error": f"Failed to compute distributions: {str(e)}", "code": "EDA_ERROR"}), 500


@eda_bp.route("/correlation", methods=["GET"])
def get_eda_correlation():
    source = request.args.get("source", "benchmark")
    crop = request.args.get("crop", None)
    season = request.args.get("season", None)

    try:
        corr = EdaService.get_correlation(source=source, crop=crop, season=season)
        return jsonify(corr), 200
    except Exception as e:
        return jsonify({"error": f"Failed to compute correlation matrix: {str(e)}", "code": "EDA_ERROR"}), 500


@eda_bp.route("/missing-values", methods=["GET"])
def get_eda_missing_values():
    source = request.args.get("source", "benchmark")

    try:
        missing = EdaService.get_missing_values(source=source)
        return jsonify(missing), 200
    except Exception as e:
        return jsonify({"error": f"Failed to compute missing value summary: {str(e)}", "code": "EDA_ERROR"}), 500


@eda_bp.route("/numerical-summary", methods=["GET"])
def get_eda_numerical_summary():
    source = request.args.get("source", "benchmark")
    crop = request.args.get("crop", None)
    season = request.args.get("season", None)

    try:
        summary = EdaService.get_numerical_summary(source=source, crop=crop, season=season)
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"error": f"Failed to compute numerical summary: {str(e)}", "code": "EDA_ERROR"}), 500


@eda_bp.route("/filters", methods=["GET"])
def get_eda_filters():
    source = request.args.get("source", "benchmark")

    try:
        filters = EdaService.get_filters(source=source)
        return jsonify(filters), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch dataset filter options: {str(e)}", "code": "EDA_ERROR"}), 500
