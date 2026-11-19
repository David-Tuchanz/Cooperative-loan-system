
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from app.models import LoanApplication, LoanApplicationAssessment
from app.routes.permissions import role_required


assessments_bp = Blueprint(
    "assessments",
    __name__,
    url_prefix="/api/assessments"
)

NUMERIC_FIELDS = {
    "monthly_income",
    "existing_monthly_obligation",
    "savings_balance",
    "share_value",
    "collateral_value",
    "monthly_contribution",
    "total_contributions"
}

INTEGER_FIELDS = {
    "previous_loan_count",
    "previous_default_count",
    "number_of_dependents",
    "guarantor_count"
}

TEXT_FIELDS = {
    "employment_status",
    "occupation",
    "marital_status",
    "collateral_type",
    "contribution_frequency",
    "contribution_status"
}

ALL_FIELDS = (
    NUMERIC_FIELDS
    | INTEGER_FIELDS
    | TEXT_FIELDS
    | {"previous_repayment_rate"}
)


def validate_assessment(data):
    cleaned = {}

    for field in ALL_FIELDS:
        if field not in data:
            continue

        value = data[field]

        if value is None or value == "":
            cleaned[field] = None
            continue

        if field in NUMERIC_FIELDS:
            try:
                number = Decimal(str(value))
                if not number.is_finite() or number < 0:
                    raise InvalidOperation
                cleaned[field] = number
            except (InvalidOperation, ValueError):
                return None, f"{field} must be a valid non-negative number."

        elif field in INTEGER_FIELDS:
            if (
                not isinstance(value, int)
                or isinstance(value, bool)
                or value < 0
            ):
                return None, f"{field} must be a non-negative integer."
            cleaned[field] = value

        elif field in TEXT_FIELDS:
            if not isinstance(value, str):
                return None, f"{field} must be text."
            cleaned[field] = value.strip() or None

    if (
        "previous_repayment_rate" in data
        and data["previous_repayment_rate"] not in (None, "")
    ):
        try:
            rate = Decimal(str(data["previous_repayment_rate"]))
            if not rate.is_finite() or rate < 0 or rate > 1:
                raise InvalidOperation
            cleaned["previous_repayment_rate"] = rate
        except (InvalidOperation, ValueError):
            return None, "previous_repayment_rate must be between 0 and 1."

    if (
        cleaned.get("previous_default_count") is not None
        and cleaned.get("previous_loan_count") is not None
        and cleaned["previous_default_count"]
        > cleaned["previous_loan_count"]
    ):
        return None, (
            "previous_default_count cannot exceed previous_loan_count."
        )

    if cleaned.get("contribution_status") not in (
        None, "active", "inactive", "irregular"
    ):
        return None, (
            "contribution_status must be active, inactive, or irregular."
        )

    if cleaned.get("contribution_frequency") not in (
        None, "weekly", "monthly", "quarterly", "annually", "other"
    ):
        return None, (
            "contribution_frequency must be weekly, monthly, quarterly, "
            "annually, or other."
        )

    return cleaned, None


@assessments_bp.get("/<int:application_id>")
@jwt_required()
@role_required("admin", "loan_officer")
def get_assessment(application_id):
    application = db.session.get(LoanApplication, application_id)

    if application is None:
        return jsonify({"message": "Loan application not found."}), 404

    assessment = LoanApplicationAssessment.query.filter_by(
        application_id=application_id
    ).first()

    if assessment is None:
        return jsonify({"message": "Assessment not found."}), 404

    return jsonify({
        "application": application.to_dict(),
        "assessment": assessment.to_dict()
    }), 200


@assessments_bp.put("/<int:application_id>")
@jwt_required()
@role_required("admin", "loan_officer")
def update_assessment(application_id):
    application = db.session.get(LoanApplication, application_id)

    if application is None:
        return jsonify({"message": "Loan application not found."}), 404

    if application.application_status != "pending":
        return jsonify({
            "message": "Only pending applications can be assessed."
        }), 409

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON body is required."}), 400

    unknown_fields = set(data) - ALL_FIELDS
    if unknown_fields:
        return jsonify({
            "message": "Unknown assessment fields.",
            "fields": sorted(unknown_fields)
        }), 400

    cleaned, error = validate_assessment(data)
    if error:
        return jsonify({"message": error}), 400

    assessment = LoanApplicationAssessment.query.filter_by(
        application_id=application_id
    ).first()

    if assessment is None:
        return jsonify({
            "message": "Assessment record not found for this application."
        }), 404

    user_id = int(get_jwt_identity())

    for field, value in cleaned.items():
        setattr(assessment, field, value)

    assessment.updated_by = user_id

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": "Assessment updated successfully.",
        "assessment": assessment.to_dict()
    }), 200
