
from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash

from extensions import db
from app.models import Member, User
from app.routes.permissions import role_required


members_bp = Blueprint("members", __name__, url_prefix="/api/members")


@members_bp.get("/")
@jwt_required()
@role_required("admin", "loan_officer")
def list_members():
    members = Member.query.order_by(Member.member_id.desc()).all()

    return jsonify({
        "count": len(members),
        "members": [member.to_dict() for member in members]
    }), 200


@members_bp.get("/<int:member_id>")
@jwt_required()
@role_required("admin", "loan_officer")
def get_member(member_id):
    member = db.session.get(Member, member_id)

    if member is None:
        return jsonify({"message": "Member not found."}), 404

    return jsonify(member.to_dict()), 200


@members_bp.post("/")
@jwt_required()
@role_required("admin", "loan_officer")
def register_member():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON body is required."}), 400

    required_fields = [
        "username",
        "password",
        "first_name",
        "last_name",
        "membership_date"
    ]

    missing_fields = [
        field for field in required_fields
        if not data.get(field)
    ]

    if missing_fields:
        return jsonify({
            "message": "Required fields are missing.",
            "fields": missing_fields
        }), 400

    username = data["username"].strip()
    email = data.get("email")
    email = email.strip() if isinstance(email, str) else email
    password = data["password"]

    if not isinstance(password, str) or len(password) < 12:
        return jsonify({
            "message": "Password must contain at least 12 characters."
        }), 400

    if not username:
        return jsonify({"message": "Username cannot be empty."}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists."}), 409

    if email and User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists."}), 409

    try:
        membership_date = date.fromisoformat(data["membership_date"])
    except (TypeError, ValueError):
        return jsonify({
            "message": "membership_date must use YYYY-MM-DD format."
        }), 400

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
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
            gender=data.get("gender"),
            date_of_birth=data.get("date_of_birth"),
            phone=data.get("phone"),
            email=email,
            address=data.get("address"),
            membership_date=membership_date,
            membership_status="active"
        )

        db.session.add(member)
        db.session.commit()

        return jsonify({
            "message": "Member registered successfully.",
            "member": member.to_dict()
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "Registration failed because a username, email, or linked record conflicts with existing data."
        }), 409

    except Exception:
        db.session.rollback()
        raise
