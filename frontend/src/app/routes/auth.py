
from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from werkzeug.security import check_password_hash

from app.models import User


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return {
            "message": "Username and password are required."
        }, 400

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(
        user.password_hash, password
    ):
        return {
            "message": "Invalid username or password."
        }, 401

    if user.status != "active":
        return {
            "message": "This account is inactive."
        }, 403

    access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={"role": user.role}
    )

    refresh_token = create_refresh_token(
        identity=str(user.user_id),
        additional_claims={"role": user.role}
    )

    return {
        "message": "Login successful.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict()
    }, 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()

    user = User.query.filter_by(user_id=user_id).first()

    if not user or user.status != "active":
        return {
            "message": "Account not found or inactive."
        }, 401

    new_access_token = create_access_token(
        identity=str(user.user_id),
        additional_claims={"role": user.role}
    )

    return {
        "access_token": new_access_token
    }, 200
