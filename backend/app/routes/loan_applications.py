
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from extensions import db
from app.models import (
    LoanApplication,
    Member,
    LoanApplicationAssessment,
    Notification,
    User
)
from app.routes.permissions import role_required
from app.routes.assessments import ALL_FIELDS, validate_assessment


loan_applications_bp = Blueprint(
    "loan_applications",
    __name__,
    url_prefix="/api/loan-applications"
)

TERMS_VERSION = "1.0"


def calculate_age(date_of_birth):
    if not date_of_birth:
        return None

    today = date.today()

    return (
        today.year
        - date_of_birth.year
        - (
            (today.month, today.day)
            < (date_of_birth.month, date_of_birth.day)
        )
    )

def parse_assessment(data):
    """Validate the assessment block of an application payload.
    Returns (cleaned_assessment, error_response)."""
    payload = data.get("assessment")

    if not isinstance(payload, dict):
        return None, (jsonify({
            "message": "Personal and financial assessment information is required."
        }), 400)

    unknown_fields = set(payload) - ALL_FIELDS
    if unknown_fields:
        return None, (jsonify({
            "message": "Unknown assessment fields.",
            "fields": sorted(unknown_fields)
        }), 400)

    cleaned, error = validate_assessment(payload)
    if error:
        return None, (jsonify({"message": error}), 400)

    if cleaned.get("monthly_income") is None:
        return None, (jsonify({"message": "Monthly income is required."}), 400)

    return cleaned, None

@loan_applications_bp.post("/")
@jwt_required()
@role_required("member", "loan_officer")
def create_application():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "message": "A valid JSON body is required."
        }), 400

    # Validate requested amount
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
        return jsonify({
            "message": "loan_purpose is required."
        }), 400

    if not isinstance(loan_type, str) or not loan_type.strip():
        return jsonify({
            "message": "loan_type is required."
        }), 400

    if (
        not isinstance(term, int)
        or isinstance(term, bool)
        or term <= 0
    ):
        return jsonify({
            "message": "loan_term must be a positive integer."
        }), 400

    allowed_frequencies = {
        "weekly",
        "monthly",
        "quarterly"
    }

    if frequency not in allowed_frequencies:
        return jsonify({
            "message": (
                "repayment_frequency must be weekly, monthly, or quarterly."
            )
        }), 400

    # Validate optional interest rate
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
                "message": (
                    "interest_rate must be a valid non-negative number."
                )
            }), 400

    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")

        # Members are not permitted to set loan interest rates.
    if role == "member" and data.get("interest_rate") not in (None, ""):
        return jsonify({
            "message": (
                "Interest rate is determined by the cooperative "
                "and cannot be set by members."
            )
        }), 403

    assessment_data = {}
    cleaned_assessment = {}
    member = None

    # MEMBER SELF-SERVICE APPLICATION
    if role == "member":

        # Always identify the member through the authenticated account.
        # Never accept a member_id supplied by the browser.
        member = Member.query.filter_by(
            user_id=user_id
        ).first()

        if member is None:
            return jsonify({
                "message": "No member profile is linked to this account."
            }), 404

        if member.membership_status == "inactive":
            return jsonify({
                "message": "Your membership is inactive. Please contact the cooperative."
            }), 403

        # Verify actual date of birth.
        age = calculate_age(member.date_of_birth)

        if age is None:
            return jsonify({
                "message": (
                    "Your date of birth is missing from your member profile. "
                    "Please contact the cooperative."
                )
            }), 400

        if age < 18:
            return jsonify({
                "message": (
                    "You must be at least 18 years old to apply for a loan."
                )
            }), 403

        # Require both applicant declarations.
        if data.get("legal_age_confirmed") is not True:
            return jsonify({
                "message": (
                    "You must confirm that you are at least 18 years old."
                )
            }), 400

        if data.get("terms_accepted") is not True:
            return jsonify({
                "message": (
                    "You must accept the Terms and Conditions."
                )
            }), 400

        # Validate the assessment submitted with the application.
        assessment_data = data.get("assessment")

        if not isinstance(assessment_data, dict):
            return jsonify({
                "message": (
                    "Personal and financial assessment information is required."
                )
            }), 400

        unknown_fields = set(assessment_data) - ALL_FIELDS

        if unknown_fields:
            return jsonify({
                "message": "Unknown assessment fields.",
                "fields": sorted(unknown_fields)
            }), 400

        cleaned_assessment, error = validate_assessment(
            assessment_data
        )

        if error:
            return jsonify({
                "message": error
            }), 400

        # Monthly income is required by the current prediction service.
        if cleaned_assessment.get("monthly_income") is None:
            return jsonify({
                "message": "Monthly income is required."
            }), 400

        member_id = member.member_id
        submission_method = "member_self_service"

        # OFFICER-ASSISTED APPLICATION
    else:

        member_id = data.get("member_id")

        if (
            not isinstance(member_id, int)
            or isinstance(member_id, bool)
        ):
            return jsonify({
                "message": (
                    "A valid member_id is required for "
                    "officer-assisted applications."
                )
            }), 400

        member = db.session.get(Member, member_id)

        if member is None:
            return jsonify({
                "message": "Member not found."
            }), 404

        if member.membership_status == "inactive":
            return jsonify({
                "message": "Inactive members cannot apply for loans."
            }), 409

        cleaned_assessment, error_response = parse_assessment(data)

        if error_response:
            return error_response

        submission_method = "officer_assisted"

    # Create application and assessment together.
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

    if role == "member":
        application.legal_age_confirmed = True
        application.terms_accepted = True
        application.terms_version = TERMS_VERSION
        application.terms_accepted_at = datetime.utcnow()

    try:
        db.session.add(application)
        db.session.flush()

        assessment = LoanApplicationAssessment(
            application_id=application.application_id,
            created_by=user_id,
            **cleaned_assessment
        )

        db.session.add(assessment)

        # Notify active loan officers when a Member submits an application.
        if role == "member":
            loan_officers = User.query.filter_by(
                role="loan_officer",
                status="active"
            ).all()

            for officer in loan_officers:
                notification = Notification(
                    user_id=officer.user_id,
                    title="New Loan Application",
                    message=(
                        f"A new loan application "
                        f"(#{application.application_id}) "
                        f"has been submitted and is awaiting review."
                    ),
                    notification_type="loan_application_submitted",
                    related_id=application.application_id
                )

                db.session.add(notification)

        db.session.commit()

        return jsonify({
            "message": "Loan application submitted successfully.",
            "application": application.to_dict(),
            "assessment": assessment.to_dict()
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

        member = Member.query.filter_by(
            user_id=user_id
        ).first()

        if member is None:
            return jsonify({
                "message": "No member profile is linked to this account."
            }), 404

        query = query.filter_by(
            member_id=member.member_id
        )

    applications = query.order_by(
        LoanApplication.application_id.desc()
    ).all()

    return jsonify({
        "count": len(applications),
        "applications": [
            application.to_dict()
            for application in applications
        ]
    }), 200
