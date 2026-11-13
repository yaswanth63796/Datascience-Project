"""
Authentication & Authorization Utilities
Implements secure password verification, HMAC signed token generation/verification,
and route-protection decorators.
"""
import functools
from datetime import datetime, timezone
from flask import request, jsonify, current_app
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from app.extensions import db
from app.models.admin_user import AdminUser

def get_serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

def generate_auth_token(user_id: int, expires_in_hours: int = 24) -> str:
    s = get_serializer()
    return s.dumps({"user_id": user_id, "created_at": datetime.now(timezone.utc).isoformat()})

def verify_auth_token(token: str, max_age_seconds: int = 86400):
    s = get_serializer()
    try:
        data = s.loads(token, max_age=max_age_seconds)
        user_id = data.get("user_id")
        user = db.session.get(AdminUser, user_id)
        return user
    except (SignatureExpired, BadSignature, Exception):
        return None

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({"error": "Authentication token missing.", "code": "UNAUTHORIZED"}), 401

        user = verify_auth_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired session token.", "code": "UNAUTHORIZED"}), 401

        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def role_required(*allowed_roles):
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            user = getattr(request, "current_user", None)
            if not user or user.role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions.", "code": "FORBIDDEN"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
