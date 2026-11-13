"""
AgriCredit Flask Application Factory
"""
import os
from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True,
    )

    # Ensure upload directory exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(os.path.join(app.root_path, "..", "instance"), exist_ok=True)

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.farmer_routes import farmer_bp
    from app.routes.application_routes import application_bp
    from app.routes.assessment_routes import assessment_bp
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.dataset_routes import dataset_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.eligibility_routes import eligibility_bp
    from app.routes.eda_routes import eda_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(farmer_bp, url_prefix="/api/farmers")
    app.register_blueprint(application_bp, url_prefix="/api/applications")
    app.register_blueprint(assessment_bp, url_prefix="/api/applications")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(dataset_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(eligibility_bp, url_prefix="/api/agricredit")
    app.register_blueprint(eda_bp, url_prefix="/api/eda")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "AgriCredit Agricultural Credit Assessment Engine",
            "version": "1.0.0",
            "timestamp": "2026-10-26T21:05:00Z",
        }), 200

    # Error handling
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found.", "code": "NOT_FOUND"}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request.", "code": "BAD_REQUEST"}), 400

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error occurred.", "code": "SERVER_ERROR"}), 500

    # Create tables and default admin user within context
    with app.app_context():
        db.create_all()
        # Seed initial admin user if not present
        from app.models.admin_user import AdminUser
        admin = AdminUser.query.filter_by(username="admin").first()
        if not admin:
            admin = AdminUser(
                username="admin",
                email="admin@agricredit.internal",
                role="admin",
                full_name="Lead Agricultural Credit Officer",
            )
            admin.set_password("AgriAdmin@2026")
            db.session.add(admin)
            db.session.commit()

    return app
