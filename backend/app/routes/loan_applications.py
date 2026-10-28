
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from extensions import db
from app.models import LoanApplication, Member, LoanApplicationAssessment
from app.routes.permissions import role_required


loan_applications_bp = Blueprint(
    "loan_applications",
    __name__,
    url_prefix="/api/loan-applications"
)


@loan_applications_bp.post("/")
@jwt_required()
@role_required("member", "loan_officer")
def create_application():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON body is required."}), 400

    try:
        amount = Decimal(str(data.get("amount_requested", "")))
        if not amount.is_finite() or amount <= 0:
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        return jsonify({
            "message": "amount_requested must be a valid positive number."
        }), 400

    purpose = data.get("loan_purpose")
    loan_type = data.get("loan_type")
    term = data.get("loan_term")
    frequency = data.get("repayment_frequency")
    interest_rate_value = data.get("interest_rate")

    if not isinstance(purpose, str) or not purpose.strip():
        return jsonify({"message": "loan_purpose is required."}), 400

    if not isinstance(loan_type, str) or not loan_type.strip():
        return jsonify({"message": "loan_type is required."}), 400

    if not isinstance(term, int) or isinstance(term, bool) or term <= 0:
        return jsonify({"message": "loan_term must be a positive integer."}), 400

    allowed_frequencies = {"weekly", "monthly", "quarterly"}
    if frequency not in allowed_frequencies:
        return jsonify({
            "message": (
                "repayment_frequency must be weekly, monthly, or quarterly."
            )
        }), 400

    interest_rate = None
    if interest_rate_value not in (None, ""):
        try:
            interest_rate = Decimal(str(interest_rate_value))
            if (
                not interest_rate.is_finite()
                or interest_rate < 0
                or interest_rate > 999.9999
            ):
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            return jsonify({
                "message": "interest_rate must be a valid non-negative number."
            }), 400

    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")

    if role == "member":
        member = Member.query.filter_by(user_id=user_id).first()

        if member is None:
            return jsonify({
                "message": "No member profile is linked to this account."
            }), 404

        member_id = member.member_id
        submission_method = "member_self_service"

    else:
        member_id = data.get("member_id")

        if not isinstance(member_id, int) or isinstance(member_id, bool):
            return jsonify({
                "message": (
                    "A valid member_id is required for "
                    "officer-assisted applications."
                )
            }), 400

        member = db.session.get(Member, member_id)

        if member is None:
            return jsonify({"message": "Member not found."}), 404

        submission_method = "officer_assisted"

    application = LoanApplication(
        member_id=member_id,
        submitted_by=user_id,
        amount_requested=amount,
        loan_type=loan_type.strip(),
        loan_purpose=purpose.strip(),
        loan_term=term,
        interest_rate=interest_rate,
        repayment_frequency=frequency,
        submission_method=submission_method,
        application_status="pending"
    )

    try:
        db.session.add(application)
        db.session.flush()

        assessment = LoanApplicationAssessment(
            application_id=application.application_id,
            created_by=user_id
        )

        db.session.add(assessment)
        db.session.commit()

        return jsonify({
            "message": "Loan application submitted successfully.",
            "application": application.to_dict()
        }), 201

    except Exception:
        db.session.rollback()
        raise


@loan_applications_bp.get("/")
@jwt_required()
@role_required("admin", "loan_officer", "member")
def list_applications():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")

    query = LoanApplication.query

    if role == "member":
        member = Member.query.filter_by(user_id=user_id).first()

        if member is None:
            return jsonify({
                "message": "No member profile is linked to this account."
            }), 404

        query = query.filter_by(member_id=member.member_id)

    applications = query.order_by(
        LoanApplication.application_id.desc()
    ).all()

    return jsonify({
        "count": len(applications),
        "applications": [
            application.to_dict() for application in applications
        ]
    }), 200
