"""
Authentication Routes
Endpoints: /api/auth/login, /api/auth/logout, /api/auth/me
"""
from flask import Blueprint, request, jsonify
from app.models.admin_user import AdminUser
from app.utils.auth import generate_auth_token, login_required

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = AdminUser.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password credentials."}), 401

    token = generate_auth_token(user.id)
    return jsonify({
        "message": "Login successful.",
        "token": token,
        "user": user.to_dict(),
    }), 200

@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    # Stateless token architecture; client discards token
    return jsonify({"message": "Successfully logged out."}), 200

@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    user = getattr(request, "current_user", None)
    if not user:
        return jsonify({"error": "User not authenticated."}), 401
    return jsonify({"user": user.to_dict()}), 200
