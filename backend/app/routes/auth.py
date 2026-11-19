
from datetime import date, datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from app.models import User, Member

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

@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "message": "A valid JSON body is required."
        }), 400

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    phone = data.get("phone")
    date_of_birth_value = data.get("date_of_birth")
    gender = data.get("gender")

    required_fields = {
        "username": username,
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
    }

    for field, value in required_fields.items():
        if not isinstance(value, str) or not value.strip():
            return jsonify({
                "message": f"{field.replace('_', ' ').title()} is required."
            }), 400

    username = username.strip()
    email = email.strip().lower()
    first_name = first_name.strip()
    last_name = last_name.strip()

    if len(username) > 50:
        return jsonify({
            "message": "Username must not exceed 50 characters."
        }), 400

    if len(email) > 100 or "@" not in email:
        return jsonify({
            "message": "Enter a valid email address."
        }), 400

    if len(first_name) > 50 or len(last_name) > 50:
        return jsonify({
            "message": "First name and last name must not exceed 50 characters."
        }), 400

    if len(password) < 12:
        return jsonify({
            "message": "Password must contain at least 12 characters."
        }), 400

    if phone is not None:
        if not isinstance(phone, str) or len(phone.strip()) > 20:
            return jsonify({
                "message": "Phone number must not exceed 20 characters."
            }), 400
        phone = phone.strip() or None

    try:
        date_of_birth = datetime.strptime(
            date_of_birth_value, "%Y-%m-%d"
        ).date()
    except (ValueError, TypeError):
        return jsonify({
            "message": "A valid date of birth is required."
        }), 400

    if date_of_birth >= date.today():
        return jsonify({
            "message": "Date of birth must be in the past."
        }), 400

    allowed_genders = [
        "Male",
        "Female",
        "Other",
        "Prefer not to say"
    ]

    if gender not in allowed_genders:
        return jsonify({
            "message": "Please select a valid gender."
        }), 400

    if User.query.filter_by(username=username).first():
        return jsonify({
            "message": "Username already exists."
        }), 409

    if User.query.filter_by(email=email).first():
        return jsonify({
            "message": "Email already exists."
        }), 409

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role="member",
        status="active"
    )

    try:
        db.session.add(user)
        db.session.flush()

        member = Member(
            user_id=user.user_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            date_of_birth=date_of_birth,
            gender=gender,
            phone=phone,
            membership_date=date.today(),
            membership_status="active",
            cooperative_id=1
        )

        db.session.add(member)
        db.session.commit()

        return jsonify({
            "message": "Account created successfully. You can now log in.",
            "user": user.to_dict(),
            "member": member.to_dict()
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "Registration failed. The username or email may already be in use."
        }), 409

    except Exception:
        db.session.rollback()
        raise