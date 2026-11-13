import os

basedir = os.path.abspath(os.path.dirname(__file__))
backend_dir = os.path.abspath(os.path.join(basedir, ".."))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "agricredit-dev-insecure-secret-key-2026")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(backend_dir, 'instance', 'agricredit.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload configuration
    UPLOAD_FOLDER = os.environ.get(
        "UPLOAD_FOLDER", os.path.join(basedir, "uploads")
    )
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max limit
    ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "csv", "txt"}
    
    # ML Pipeline Artifacts
    ML_ARTIFACTS_DIR = os.path.join(backend_dir, "ml", "artifacts")
    MODEL_PATH = os.path.join(ML_ARTIFACTS_DIR, "model.joblib")
    METRICS_PATH = os.path.join(ML_ARTIFACTS_DIR, "metrics.json")
    SCHEMA_PATH = os.path.join(ML_ARTIFACTS_DIR, "feature_schema.json")
    
    # Agricultural Financial Policy Assumptions
    # Note: 7.0% per annum is standard illustrative Kisan Credit Card (KCC) interest rate with interest subvention
    DEFAULT_ASSUMED_INTEREST_RATE = float(os.environ.get("DEFAULT_INTEREST_RATE", "7.0"))
    
    # CORS Origins
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
