from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash

from extensions import db
from app.models import Loan, LoanApplication, Member, Repayment, RiskPrediction, User
from app.routes.permissions import role_required


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

STAFF_ROLES = {"admin", "loan_officer"}
ACCOUNT_STATUSES = {"active", "inactive"}


@admin_bp.get("/users")
@jwt_required()
@role_required("admin")
def list_users():
    users = User.query.order_by(User.user_id.desc()).all()
    results = []

    for user in users:
        member = Member.query.filter_by(user_id=user.user_id).first()

        results.append({
            **user.to_dict(),
            "member": ({
                "member_id": member.member_id,
                "first_name": member.first_name,
                "last_name": member.last_name,
                "phone": member.phone,
                "membership_status": member.membership_status,
            } if member else None)
        })

    return jsonify({"count": len(results), "users": results}), 200


@admin_bp.post("/users")
@jwt_required()
@role_required("admin")
def create_staff_user():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON body is required."}), 400

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all(isinstance(value, str) and value.strip()
               for value in (username, email, password, role)):
        return jsonify({
            "message": "Username, email, password, and role are required."
        }), 400

    username = username.strip()
    email = email.strip().lower()
    role = role.strip().lower()

    if role not in STAFF_ROLES:
        return jsonify({
            "message": "Staff role must be admin or loan_officer."
        }), 400

    if len(password) < 12:
        return jsonify({
            "message": "Password must contain at least 12 characters."
        }), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists."}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists."}), 409

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        status="active",
    )

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "A user with that username or email already exists."
        }), 409

    return jsonify({
        "message": "Staff account created successfully.",
        "user": user.to_dict(),
    }), 201


@admin_bp.patch("/users/<int:user_id>")
@jwt_required()
@role_required("admin")
def update_staff_user(user_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({"message": "A valid JSON body is required."}), 400

    allowed_fields = {"role", "status"}
    unknown_fields = set(data) - allowed_fields

    if unknown_fields:
        return jsonify({
            "message": "Only role and status can be updated here.",
            "fields": sorted(unknown_fields),
        }), 400

    user = db.session.get(User, user_id)

    if user is None:
        return jsonify({"message": "User not found."}), 404

    # Member accounts are managed through the member registration workflow.
    if user.role == "member":
        return jsonify({
            "message": "Member accounts cannot be changed through staff role management."
        }), 409

    current_user_id = int(get_jwt_identity())
    if user.user_id == current_user_id:
        return jsonify({
            "message": "You cannot change your own role or account status."
        }), 403

    new_role = data.get("role", user.role)
    new_status = data.get("status", user.status)

    if new_role not in STAFF_ROLES:
        return jsonify({
            "message": "Role must be admin or loan_officer."
        }), 400

    if new_status not in ACCOUNT_STATUSES:
        return jsonify({
            "message": "Status must be active or inactive."
        }), 400

    removing_active_admin = (
        user.role == "admin"
        and user.status == "active"
        and (new_role != "admin" or new_status != "active")
    )

    if removing_active_admin:
        active_admin_count = User.query.filter_by(
            role="admin", status="active"
        ).count()

        if active_admin_count <= 1:
            return jsonify({
                "message": "The system must retain at least one active administrator."
            }), 409

    user.role = new_role
    user.status = new_status

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Unable to update this user."}), 409

    return jsonify({
        "message": "User updated successfully.",
        "user": user.to_dict(),
    }), 200


@admin_bp.get("/roles")
@jwt_required()
@role_required("admin")
def list_roles():
    return jsonify({
        "roles": [
            {
                "value": "admin",
                "label": "Administrator",
                "description": "Manages system users, roles, records, and reports.",
            },
            {
                "value": "loan_officer",
                "label": "Loan Officer",
                "description": "Manages members, applications, loan decisions, and repayments.",
            },
            {
                "value": "member",
                "label": "Member",
                "description": "Submits applications and views personal loan information.",
            },
        ]
    }), 200


# ---------------------------------------------------------------------------
# Read-only record listings for the administrator Records page
# ---------------------------------------------------------------------------

def _usernames():
    return {
        row.user_id: row.username
        for row in db.session.query(User.user_id, User.username).all()
    }


def _member_names():
    return {
        row.member_id: f"{row.first_name} {row.last_name}".strip()
        for row in db.session.query(
            Member.member_id, Member.first_name, Member.last_name
        ).all()
    }


@admin_bp.get("/applications")
@jwt_required()
@role_required("admin")
def list_application_records():
    usernames = _usernames()
    member_names = _member_names()

    applications = LoanApplication.query.order_by(
        LoanApplication.application_id.desc()
    ).all()

    results = [{
        **application.to_dict(),
        "member_name": member_names.get(application.member_id),
        "submitted_by_username": usernames.get(application.submitted_by),
        "decision_by_username": usernames.get(application.decision_by),
    } for application in applications]

    return jsonify({"count": len(results), "applications": results}), 200


@admin_bp.get("/loans")
@jwt_required()
@role_required("admin")
def list_loan_records():
    member_names = _member_names()

    rows = (
        db.session.query(Loan, LoanApplication)
        .join(
            LoanApplication,
            Loan.application_id == LoanApplication.application_id,
        )
        .order_by(Loan.loan_id.desc())
        .all()
    )

    results = [{
        **loan.to_dict(),
        "member_id": application.member_id,
        "member_name": member_names.get(application.member_id),
        "loan_type": application.loan_type,
        "loan_purpose": application.loan_purpose,
        "loan_term": application.loan_term,
        "repayment_frequency": application.repayment_frequency,
    } for loan, application in rows]

    return jsonify({"count": len(results), "loans": results}), 200


@admin_bp.get("/repayments")
@jwt_required()
@role_required("admin")
def list_repayment_records():
    usernames = _usernames()
    member_names = _member_names()

    rows = (
        db.session.query(Repayment, LoanApplication)
        .join(Loan, Repayment.loan_id == Loan.loan_id)
        .join(
            LoanApplication,
            Loan.application_id == LoanApplication.application_id,
        )
        .order_by(Repayment.repayment_id.desc())
        .all()
    )

    results = [{
        **repayment.to_dict(),
        "member_id": application.member_id,
        "member_name": member_names.get(application.member_id),
        "recorded_by_username": usernames.get(repayment.recorded_by),
    } for repayment, application in rows]

    return jsonify({"count": len(results), "repayments": results}), 200


@admin_bp.get("/risk-predictions")
@jwt_required()
@role_required("admin")
def list_risk_prediction_records():
    member_names = _member_names()

    rows = (
        db.session.query(RiskPrediction, LoanApplication)
        .join(
            LoanApplication,
            RiskPrediction.application_id == LoanApplication.application_id,
        )
        .order_by(RiskPrediction.prediction_id.desc())
        .all()
    )

    results = [{
        **prediction.to_dict(),
        "member_id": application.member_id,
        "member_name": member_names.get(application.member_id),
        "loan_type": application.loan_type,
        "amount_requested": (
            float(application.amount_requested)
            if application.amount_requested is not None else None
        ),
        "application_status": application.application_status,
    } for prediction, application in rows]

    return jsonify({"count": len(results), "predictions": results}), 200