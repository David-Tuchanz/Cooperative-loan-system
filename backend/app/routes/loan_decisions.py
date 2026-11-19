
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from app.models import LoanApplication, Loan, Notification
from app.routes.permissions import role_required


loan_decisions_bp = Blueprint(
    "loan_decisions",
    __name__,
    url_prefix="/api/loan-decisions"
)


@loan_decisions_bp.post("/<int:application_id>")
@jwt_required()
@role_required("loan_officer")
def decide_application(application_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON body is required."}), 400

    decision = data.get("decision")

    if decision not in {"approved", "rejected"}:
        return jsonify({
            "message": "decision must be 'approved' or 'rejected'."
        }), 400

    application = db.session.get(LoanApplication, application_id)

    if application is None:
        return jsonify({"message": "Loan application not found."}), 404

    if application.application_status != "pending":
        return jsonify({
            "message": "Only pending applications can receive a decision."
        }), 409

    loan = None

    if decision == "approved":
        try:
            amount = Decimal(str(data.get("amount_approved", "")))
            if not amount.is_finite() or amount <= 0:
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            return jsonify({
                "message": "amount_approved must be a positive number."
            }), 400

        if amount > application.amount_requested:
            return jsonify({
                "message": "The approved amount cannot exceed the requested amount."
            }), 400

        try:
            interest_rate = Decimal(str(data.get("interest_rate", "")))
            if not interest_rate.is_finite() or interest_rate < 0 or interest_rate > 100:
                raise InvalidOperation
        except (InvalidOperation, ValueError):
            return jsonify({
                "message": "interest_rate must be between 0 and 100."
            }), 400

        disbursement_date = None
        supplied_date = data.get("disbursement_date")

        if supplied_date:
            try:
                disbursement_date = date.fromisoformat(supplied_date)
            except (TypeError, ValueError):
                return jsonify({
                    "message": "disbursement_date must use YYYY-MM-DD format."
                }), 400

        loan = Loan(
            application_id=application.application_id,
            amount_approved=amount,
            interest_rate=interest_rate,
            disbursement_date=disbursement_date,
            amount_due=amount,
            outstanding_balance=amount,
            loan_status="active"
        )

    application.application_status = decision
    application.decision_by = int(get_jwt_identity())
    application.decision_date = db.func.current_timestamp()

    try:
        if loan is not None:
            db.session.add(loan)

        # Notify the Member about the loan decision.
        member = application.member

        if member and member.user_id:
            if decision == "approved":
                title = "Loan Application Approved"
                message = (
                    f"Your loan application "
                    f"(#{application.application_id}) "
                    f"has been approved."
                )
            else:
                title = "Loan Application Rejected"
                message = (
                    f"Your loan application "
                    f"(#{application.application_id}) "
                    f"has been rejected."
                )

            notification = Notification(
                user_id=member.user_id,
                title=title,
                message=message,
                notification_type=f"loan_application_{decision}",
                related_id=application.application_id
            )

            db.session.add(notification)

        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    result = {
        "message": f"Application {decision} successfully.",
        "application": application.to_dict()
    }

    if loan is not None:
        result["loan"] = loan.to_dict()

    return jsonify(result), 200
