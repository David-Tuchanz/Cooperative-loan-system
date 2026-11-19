
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from app.models import (
    Loan,
    Repayment,
    LoanApplication,
    Member,
    User,
    Notification
)
from app.routes.permissions import role_required


repayments_bp = Blueprint(
    "repayments",
    __name__,
    url_prefix="/api/repayments"
)


@repayments_bp.post("/loans/<int:loan_id>")
@jwt_required()
@role_required("loan_officer")
def record_repayment(loan_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON body is required."}), 400

    try:
        amount_paid = Decimal(str(data.get("amount_paid", "")))
        if not amount_paid.is_finite() or amount_paid <= 0:
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        return jsonify({
            "message": "amount_paid must be a positive number."
        }), 400

    payment_method = data.get("payment_method")
    if not isinstance(payment_method, str) or not payment_method.strip():
        return jsonify({"message": "payment_method is required."}), 400

    payment_date_value = data.get("payment_date")
    if payment_date_value:
        try:
            payment_date = date.fromisoformat(payment_date_value)
        except (TypeError, ValueError):
            return jsonify({
                "message": "payment_date must use YYYY-MM-DD format."
            }), 400
    else:
        payment_date = date.today()

    loan = db.session.get(Loan, loan_id)

    if loan is None:
        return jsonify({"message": "Loan not found."}), 404

    if loan.loan_status not in {"active", "overdue", "defaulted"}:
        return jsonify({
            "message": "Repayments can only be recorded for active, overdue, or defaulted loans."
        }), 409

    current_balance = Decimal(str(loan.outstanding_balance or 0))

    if amount_paid > current_balance:
        return jsonify({
            "message": "Payment cannot exceed the outstanding balance.",
            "outstanding_balance": float(current_balance)
        }), 400

    remaining_balance = current_balance - amount_paid

    repayment = Repayment(
        loan_id=loan_id,
        payment_date=payment_date,
        amount_paid=amount_paid,
        payment_method=payment_method.strip(),
        payment_status="completed",
        remaining_balance=remaining_balance,
        recorded_by=int(get_jwt_identity())
    )

    try:
        loan.outstanding_balance = remaining_balance

        if remaining_balance == 0:
            loan.loan_status = "completed"

        db.session.add(repayment)

        # Notify the Member about the recorded repayment.
        application = loan.application
        member = application.member if application else None

        if member and member.user_id:
            notification = Notification(
                user_id=member.user_id,
                title="Repayment Recorded",
                message=(
                    f"A repayment of ₦{amount_paid:,.2f} "
                    f"was recorded for your loan #{loan_id}. "
                    f"Your remaining balance is "
                    f"₦{remaining_balance:,.2f}."
                ),
                notification_type="repayment_recorded",
                related_id=repayment.repayment_id
            )

            db.session.add(notification)

        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": "Repayment recorded successfully.",
        "repayment": repayment.to_dict(),
        "loan": loan.to_dict()
    }), 201


@repayments_bp.get("/loans/<int:loan_id>")
@jwt_required()
@role_required("loan_officer")
def list_loan_repayments(loan_id):
    loan = db.session.get(Loan, loan_id)

    if loan is None:
        return jsonify({"message": "Loan not found."}), 404

    repayments = Repayment.query.filter_by(
        loan_id=loan_id
    ).order_by(Repayment.repayment_id.desc()).all()

    return jsonify({
        "loan_id": loan_id,
        "count": len(repayments),
        "repayments": [item.to_dict() for item in repayments]
    }), 200


@repayments_bp.get("")
@jwt_required()
@role_required("loan_officer")
def list_all_repayments():
    repayments = (
        Repayment.query
        .join(Loan, Repayment.loan_id == Loan.loan_id)
        .join(
            LoanApplication,
            Loan.application_id == LoanApplication.application_id
        )
        .join(
            Member,
            LoanApplication.member_id == Member.member_id
        )
        .outerjoin(
            User,
            Repayment.recorded_by == User.user_id
        )
        .order_by(
            Repayment.payment_date.desc(),
            Repayment.repayment_id.desc()
        )
        .all()
    )

    results = []

    for repayment in repayments:
        loan = repayment.loan
        application = loan.application
        member = application.member

        payment_data = repayment.to_dict()

        payment_data.update({
            "member_id": member.member_id,
            "member_name": f"{member.first_name} {member.last_name}",
            "member_phone": member.phone,
            "loan_status": loan.loan_status,
            "loan_type": application.loan_type,
            "loan_purpose": application.loan_purpose,
            "amount_approved": (
                float(loan.amount_approved)
                if loan.amount_approved is not None else None
            ),
            "recorded_by_name": (
                repayment.recorder.username
                if repayment.recorder else None
            )
        })

        results.append(payment_data)

    return jsonify({
        "count": len(results),
        "repayments": results
    }), 200