
from datetime import date, datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from app.models import LoanApplication, RiskPrediction
from app.routes.permissions import role_required
from app.services.risk_prediction_service import make_prediction


predictions_bp = Blueprint(
    "predictions", __name__, url_prefix="/api/predictions"
)


def calculate_age(date_of_birth, reference_date):
    if not date_of_birth or not reference_date:
        return None

    return (
        reference_date.year
        - date_of_birth.year
        - (
            (reference_date.month, reference_date.day)
            < (date_of_birth.month, date_of_birth.day)
        )
    )


def calculate_membership_days(membership_date, application_date):
    if not membership_date or not application_date:
        return None

    membership_date = membership_date.date() if isinstance(
        membership_date, datetime
    ) else membership_date

    application_date = application_date.date() if isinstance(
        application_date, datetime
    ) else application_date

    return (application_date - membership_date).days


def decimal_value(value):
    return float(value) if value is not None else None


@predictions_bp.post("/<int:application_id>")
@jwt_required()
@role_required("admin", "loan_officer")
def predict_application(application_id):
    application = db.session.get(LoanApplication, application_id)

    if application is None:
        return jsonify({"message": "Loan application not found."}), 404

    if application.application_status != "pending":
        return jsonify({
            "message": "Predictions can only be generated for pending applications."
        }), 409

    assessment = application.assessment
    member = application.member

    if assessment is None or member is None:
        return jsonify({
            "message": "Member details and loan assessment are required."
        }), 400

    if not application.loan_type or application.interest_rate is None:
        return jsonify({
            "message": "Loan type and interest rate are required for prediction."
        }), 400

    if not member.cooperative_id:
        return jsonify({
            "message": "The member's cooperative ID is required for prediction."
        }), 400

    if assessment.monthly_income is None:
        return jsonify({
            "message": "Monthly income is required for prediction."
        }), 400

    application_date = application.application_date
    membership_date = member.membership_date

    features = {
        "Application_Date": application_date,
        "Membership_Date": membership_date,
        "Age": calculate_age(
            member.date_of_birth, application_date
        ),
        "Gender": member.gender,
        "Marital_Status": assessment.marital_status,
        "Number_of_Dependents": assessment.number_of_dependents,
        "Occupation": assessment.occupation,
        "Employment_Status": assessment.employment_status,
        "Monthly_Income": decimal_value(assessment.monthly_income),
        "Yearly_Income": (
            decimal_value(assessment.monthly_income) * 12
            if assessment.monthly_income is not None else None
        ),
        "Existing_Monthly_Obligation": decimal_value(
            assessment.existing_monthly_obligation
        ),
        "Membership_Status": member.membership_status,
        "Member_Category": member.member_category,
        "Cooperative_Unit": member.cooperative_unit,
        "Savings_Balance": decimal_value(assessment.savings_balance),
        "Share_Value": decimal_value(assessment.share_value),
        "Monthly_Contribution": decimal_value(
            assessment.monthly_contribution
        ),
        "Contribution_Frequency": assessment.contribution_frequency,
        "Contribution_Status": assessment.contribution_status,
        "Previous_Default_Count": assessment.previous_default_count,
        "Previous_Repayment_Rate": decimal_value(
            assessment.previous_repayment_rate
        ),
        "Loan_Type": application.loan_type,
        "Loan_Purpose": application.loan_purpose,
        "Amount_Requested": decimal_value(application.amount_requested),
        "Loan_Term": application.loan_term,
        "Interest_Rate": decimal_value(application.interest_rate),
        "Collateral_Type": assessment.collateral_type,
        "Collateral_Value": decimal_value(assessment.collateral_value),
        "Number_of_Guarantors": assessment.guarantor_count,
        "Guarantor_Provided": (
            "Yes" if assessment.guarantor_count is not None
            and assessment.guarantor_count > 0
            else "No" if assessment.guarantor_count == 0
            else None
        ),
        "Cooperative_ID": (
        f"cooperative_{member.cooperative_id:03d}"
        if member.cooperative_id is not None
        else None
),
        "Total_Contributions": decimal_value(
            assessment.total_contributions
        ),
        "Loan_Channel": application.submission_method,
        "Membership_Duration_Days": calculate_membership_days(
            membership_date, application_date
        ),
    }

    try:
        result = make_prediction(features)

        prediction = RiskPrediction(
            application_id=application_id,
            default_probability=result["default_probability"],
            risk_level=result["risk_level"],
            model_name=result["model_name"],
            model_version=result["model_version"],
            input_snapshot=result["input_snapshot"],
        )

        db.session.add(prediction)
        db.session.commit()

        return jsonify({
            "message": "Risk prediction generated successfully.",
            "prediction": prediction.to_dict(),
        }), 201

    except (FileNotFoundError, ValueError) as error:
        db.session.rollback()
        return jsonify({"message": str(error)}), 400

    except Exception:
        db.session.rollback()
        raise
