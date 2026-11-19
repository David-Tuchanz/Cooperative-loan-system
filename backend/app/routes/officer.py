from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, select

from extensions import db
from app.models import (
    Loan,
    LoanApplication,
    Member,
    Repayment,
    RiskPrediction,
    User,
)
from app.routes.permissions import role_required


officer_bp = Blueprint("officer", __name__, url_prefix="/api/officer")

# defaulted is terminal; completed is set only by the repayment logic.
LOAN_TRANSITIONS = {
    "active": {"overdue", "defaulted"},
    "overdue": {"active", "defaulted"},
    "defaulted": set(),
}


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


def _loan_payload(loan, application, member_names):
    return {
        **loan.to_dict(),
        "member_id": application.member_id,
        "member_name": member_names.get(application.member_id),
        "loan_type": application.loan_type,
        "loan_purpose": application.loan_purpose,
        "loan_term": application.loan_term,
        "repayment_frequency": application.repayment_frequency,
    }


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

@officer_bp.get("/applications")
@jwt_required()
@role_required("admin", "loan_officer")
def list_applications():
    usernames = _usernames()
    member_names = _member_names()

    latest_ids = select(
        func.max(RiskPrediction.prediction_id)
    ).group_by(RiskPrediction.application_id)

    latest = {
        prediction.application_id: prediction
        for prediction in RiskPrediction.query.filter(
            RiskPrediction.prediction_id.in_(latest_ids)
        ).all()
    }

    applications = LoanApplication.query.order_by(
        LoanApplication.application_id.desc()
    ).all()

    results = []
    for application in applications:
        prediction = latest.get(application.application_id)

        results.append({
            **application.to_dict(),
            "member_name": member_names.get(application.member_id),
            "submitted_by_username": usernames.get(application.submitted_by),
            "decision_by_username": usernames.get(application.decision_by),
            "latest_risk_level": (
                prediction.risk_level if prediction else None
            ),
            "latest_default_probability": (
                float(prediction.default_probability)
                if prediction else None
            ),
            "latest_prediction_date": (
                prediction.prediction_date.isoformat()
                if prediction and prediction.prediction_date else None
            ),
        })

    return jsonify({"count": len(results), "applications": results}), 200


@officer_bp.patch("/applications/<int:application_id>")
@jwt_required()
@role_required("loan_officer")
def update_application_rate(application_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or not data:
        return jsonify({"message": "A valid JSON body is required."}), 400

    if set(data) - {"interest_rate"}:
        return jsonify({
            "message": "Only interest_rate can be updated here."
        }), 400

    application = db.session.get(LoanApplication, application_id)

    if application is None:
        return jsonify({"message": "Loan application not found."}), 404

    if application.application_status != "pending":
        return jsonify({
            "message": "Only pending applications can be updated."
        }), 409

    try:
        rate = Decimal(str(data.get("interest_rate", "")))
        if not rate.is_finite() or rate < 0 or rate > 100:
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        return jsonify({
            "message": "interest_rate must be a number between 0 and 100."
        }), 400

    application.interest_rate = rate

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": "Interest rate updated successfully.",
        "application": application.to_dict()
    }), 200


@officer_bp.get("/applications/<int:application_id>/predictions")
@jwt_required()
@role_required("admin", "loan_officer")
def list_application_predictions(application_id):
    application = db.session.get(LoanApplication, application_id)

    if application is None:
        return jsonify({"message": "Loan application not found."}), 404

    items = [
        prediction.to_dict()
        for prediction in RiskPrediction.query.filter_by(
            application_id=application_id
        ).order_by(RiskPrediction.prediction_id.desc()).all()
    ]

    return jsonify({
        "application_id": application_id,
        "count": len(items),
        "latest": items[0] if items else None,
        "predictions": items,
    }), 200


# ---------------------------------------------------------------------------
# Borrower profile
# ---------------------------------------------------------------------------

@officer_bp.get("/members/<int:member_id>/profile")
@jwt_required()
@role_required("admin", "loan_officer")
def member_profile(member_id):
    member = db.session.get(Member, member_id)

    if member is None:
        return jsonify({"message": "Member not found."}), 404

    applications = LoanApplication.query.filter_by(
        member_id=member_id
    ).order_by(LoanApplication.application_id.desc()).all()

    rows = (
        db.session.query(Loan, LoanApplication)
        .join(
            LoanApplication,
            Loan.application_id == LoanApplication.application_id,
        )
        .filter(LoanApplication.member_id == member_id)
        .order_by(Loan.loan_id.desc())
        .all()
    )

    names = {member_id: f"{member.first_name} {member.last_name}".strip()}
    loans = [_loan_payload(loan, app, names) for loan, app in rows]
    loan_ids = [loan.loan_id for loan, _ in rows]

    total_repaid = 0
    if loan_ids:
        total_repaid = db.session.query(
            func.coalesce(func.sum(Repayment.amount_paid), 0)
        ).filter(
            Repayment.loan_id.in_(loan_ids),
            Repayment.payment_status == "completed",
        ).scalar()

    def count_by(items, key, options):
        return {
            option: sum(1 for item in items if getattr(item, key) == option)
            for option in options
        }

    return jsonify({
        "member": member.to_dict(),
        "applications": [a.to_dict() for a in applications],
        "loans": loans,
        "summary": {
            "total_applications": len(applications),
            "applications_by_status": count_by(
                applications, "application_status",
                ("pending", "approved", "rejected", "cancelled"),
            ),
            "total_loans": len(loans),
            "loans_by_status": count_by(
                [loan for loan, _ in rows], "loan_status",
                ("active", "completed", "overdue", "defaulted"),
            ),
            "total_borrowed": float(
                sum((loan.amount_approved or 0) for loan, _ in rows)
            ),
            "total_outstanding": float(
                sum((loan.outstanding_balance or 0) for loan, _ in rows)
            ),
            "total_repaid": float(total_repaid or 0),
        },
    }), 200


# ---------------------------------------------------------------------------
# Loans
# ---------------------------------------------------------------------------

@officer_bp.get("/loans")
@jwt_required()
@role_required("admin", "loan_officer")
def list_loans():
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

    results = [
        _loan_payload(loan, application, member_names)
        for loan, application in rows
    ]

    return jsonify({"count": len(results), "loans": results}), 200


@officer_bp.get("/loans/<int:loan_id>")
@jwt_required()
@role_required("admin", "loan_officer")
def get_loan(loan_id):
    row = (
        db.session.query(Loan, LoanApplication)
        .join(
            LoanApplication,
            Loan.application_id == LoanApplication.application_id,
        )
        .filter(Loan.loan_id == loan_id)
        .first()
    )

    if row is None:
        return jsonify({"message": "Loan not found."}), 404

    loan, application = row
    usernames = _usernames()

    repayments = Repayment.query.filter_by(
        loan_id=loan_id
    ).order_by(Repayment.repayment_id.desc()).all()

    return jsonify({
        "loan": _loan_payload(loan, application, _member_names()),
        "repayments": [{
            **repayment.to_dict(),
            "recorded_by_username": usernames.get(repayment.recorded_by),
        } for repayment in repayments],
    }), 200


@officer_bp.patch("/loans/<int:loan_id>/status")
@jwt_required()
@role_required("loan_officer")
def update_loan_status(loan_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict) or set(data) != {"status"}:
        return jsonify({
            "message": "A JSON body with only a status field is required."
        }), 400

    new_status = data["status"]

    if new_status == "completed":
        return jsonify({
            "message": "Loans are completed automatically when the balance reaches zero."
        }), 400

    if new_status not in LOAN_TRANSITIONS:
        return jsonify({
            "message": "Status must be active, overdue, or defaulted."
        }), 400

    loan = db.session.get(Loan, loan_id)

    if loan is None:
        return jsonify({"message": "Loan not found."}), 404

    current = loan.loan_status or "active"

    if current == new_status:
        return jsonify({"message": f"The loan is already {current}."}), 409

    if new_status not in LOAN_TRANSITIONS.get(current, set()):
        return jsonify({
            "message": f"A {current} loan cannot be changed to {new_status}."
        }), 409

    loan.loan_status = new_status

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": "Loan status updated successfully.",
        "loan": loan.to_dict()
    }), 200