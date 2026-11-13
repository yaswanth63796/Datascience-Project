"""
Unit & Integration Tests for AgriCredit EDA Endpoints
Tests:
- GET /api/eda/overview (benchmark & database)
- GET /api/eda/distributions (histograms, bar charts, scatter points)
- GET /api/eda/correlation (numerical feature correlation)
- GET /api/eda/missing-values (data completeness)
- GET /api/eda/numerical-summary (IQR outliers, mean, std, quantiles)
- GET /api/eda/filters (crop list, seasons, data sources)
- Query filtering by crop and season
- Edge case handling (empty queries, invalid crop filter)
"""
import pytest
from app import create_app
from app.config import Config


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    DEFAULT_INTEREST_RATE = 7.0


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            yield client


def test_eda_overview_benchmark(client):
    res = client.get("/api/eda/overview")
    assert res.status_code == 200
    data = res.get_json()
    assert data["total_applications"] > 0
    assert data["total_crops"] > 0
    assert data["avg_loan_amount"] > 0
    assert data["avg_cultivated_area"] > 0
    assert "yield_unit" in data
    assert "missing_values_count" in data
    assert "outliers_count" in data


def test_eda_overview_filtered_by_crop(client):
    res = client.get("/api/eda/overview?crop=Paddy")
    assert res.status_code == 200
    data = res.get_json()
    assert data["total_applications"] > 0
    assert data["meta"]["applied_filters"]["crop"] == "Paddy"


def test_eda_overview_database(client):
    res = client.get("/api/eda/overview?source=database")
    assert res.status_code == 200
    data = res.get_json()
    assert data["meta"]["source"] == "database"


def test_eda_distributions_all(client):
    res = client.get("/api/eda/distributions")
    assert res.status_code == 200
    data = res.get_json()
    assert "crop_distribution" in data
    assert len(data["crop_distribution"]) > 0
    assert "loan_amount_distribution" in data
    assert len(data["loan_amount_distribution"]["bins"]) > 0
    assert "cultivated_area_distribution" in data
    assert len(data["cultivated_area_distribution"]["bins"]) > 0
    assert "expected_yield_distribution" in data
    assert "crop_wise_loan_amount" in data
    assert "loan_vs_cultivated_area" in data
    assert "crop_wise_revenue_or_yield" in data
    assert "eligibility_distribution" in data


def test_eda_correlation(client):
    res = client.get("/api/eda/correlation")
    assert res.status_code == 200
    data = res.get_json()
    assert "features" in data
    assert len(data["features"]) >= 2
    assert "matrix" in data
    assert "pairs" in data
    # Self-correlation of any feature should be 1.0
    first_feat = data["features"][0]["id"]
    assert round(data["matrix"][first_feat][first_feat], 1) == 1.0


def test_eda_missing_values(client):
    res = client.get("/api/eda/missing-values")
    assert res.status_code == 200
    data = res.get_json()
    assert "total_cells" in data
    assert "total_missing" in data
    assert "columns" in data
    assert len(data["columns"]) > 0


def test_eda_numerical_summary(client):
    res = client.get("/api/eda/numerical-summary")
    assert res.status_code == 200
    data = res.get_json()
    assert "rows" in data
    assert len(data["rows"]) > 0
    first_row = data["rows"][0]
    for key in ["feature", "count", "mean", "std", "median", "min", "max", "iqr", "outlier_count"]:
        assert key in first_row


def test_eda_filters(client):
    res = client.get("/api/eda/filters")
    assert res.status_code == 200
    data = res.get_json()
    assert "crops" in data
    assert len(data["crops"]) > 0
    assert "seasons" in data
    assert "data_sources" in data
    assert len(data["data_sources"]) == 2


def test_eda_nonexistent_filter_returns_empty_safely(client):
    res = client.get("/api/eda/overview?crop=NonExistentCrop123")
    assert res.status_code == 200
    data = res.get_json()
    assert data["total_applications"] == 0
