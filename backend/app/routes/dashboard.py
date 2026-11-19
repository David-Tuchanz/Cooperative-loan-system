
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from extensions import db
from app.models import (
    LoanApplication,
    Loan,
    Repayment,
    RiskPrediction,
    Member,
)
from app.routes.permissions import role_required


dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/api/dashboard"
)


@dashboard_bp.get("/")
@jwt_required()
@role_required("admin", "loan_officer")
def get_dashboard():
    # Application counts
    application_counts = {
        status: count
        for status, count in db.session.query(
            LoanApplication.application_status,
            func.count(LoanApplication.application_id)
        ).group_by(LoanApplication.application_status).all()
    }

    # Loan counts and financial totals
    loan_counts = {
        status: count
        for status, count in db.session.query(
            Loan.loan_status,
            func.count(Loan.loan_id)
        ).group_by(Loan.loan_status).all()
    }

    loan_financials = db.session.query(
        func.coalesce(func.sum(Loan.amount_approved), 0),
        func.coalesce(func.sum(Loan.outstanding_balance), 0)
    ).one()

    # Completed repayments only
    total_repayments = db.session.query(
        func.coalesce(func.sum(Repayment.amount_paid), 0)
    ).filter(
        Repayment.payment_status == "completed"
    ).scalar()

    repayment_count = Repayment.query.filter_by(
        payment_status="completed"
    ).count()

    # Latest risk prediction for each application
    latest_predictions = (
        db.session.query(
            RiskPrediction.application_id,
            func.max(RiskPrediction.prediction_id).label("latest_id")
        )
        .group_by(RiskPrediction.application_id)
        .subquery()
    )

    risk_counts = {
        level: count
        for level, count in db.session.query(
            RiskPrediction.risk_level,
            func.count(RiskPrediction.prediction_id)
        ).join(
            latest_predictions,
            RiskPrediction.prediction_id == latest_predictions.c.latest_id
        ).group_by(RiskPrediction.risk_level).all()
    }

    # Most recent applications
    recent_applications = LoanApplication.query.order_by(
        LoanApplication.application_date.desc(),
        LoanApplication.application_id.desc()
    ).limit(5).all()

    return jsonify({
        "applications": {
            "total": sum(application_counts.values()),
            "by_status": {
                status: application_counts.get(status, 0)
                for status in (
                    "pending", "approved", "rejected", "cancelled"
                )
            }
        },
        "loans": {
            "total": sum(loan_counts.values()),
            "by_status": {
                status: loan_counts.get(status, 0)
                for status in (
                    "active", "completed", "overdue", "defaulted"
                )
            },
            "total_amount_approved": float(loan_financials[0]),
            "total_outstanding_balance": float(loan_financials[1])
        },
        "repayments": {
            "completed_count": repayment_count,
            "total_amount_paid": float(total_repayments)
        },
        "risk_predictions": {
            "total": sum(risk_counts.values()),
            "by_level": {
                level: risk_counts.get(level, 0)
                for level in ("Low", "Medium", "High")
            }
        },
        "recent_applications": [
            application.to_dict()
            for application in recent_applications
        ]
    }), 200

@dashboard_bp.get("/member")
@jwt_required()
@role_required("member")
def get_member_dashboard():
    user_id = int(get_jwt_identity())

    member = Member.query.filter_by(user_id=user_id).first()

    if member is None:
        return jsonify({
            "message": "No member profile is linked to this account."
        }), 404

    # Applications belonging to this member
    applications = LoanApplication.query.filter_by(
        member_id=member.member_id
    )

    application_counts = {
        status: count
        for status, count in applications.with_entities(
            LoanApplication.application_status,
            func.count(LoanApplication.application_id)
        ).group_by(LoanApplication.application_status).all()
    }

    # Loans belonging to this member
    loans = Loan.query.join(
        LoanApplication,
        Loan.application_id == LoanApplication.application_id
    ).filter(
        LoanApplication.member_id == member.member_id
    )

    loan_counts = {
        status: count
        for status, count in loans.with_entities(
            Loan.loan_status,
            func.count(Loan.loan_id)
        ).group_by(Loan.loan_status).all()
    }

    outstanding_balance = loans.with_entities(
        func.coalesce(func.sum(Loan.outstanding_balance), 0)
    ).scalar()

    # Completed repayments belonging to this member
    repayments = Repayment.query.join(
        Loan,
        Repayment.loan_id == Loan.loan_id
    ).join(
        LoanApplication,
        Loan.application_id == LoanApplication.application_id
    ).filter(
        LoanApplication.member_id == member.member_id,
        Repayment.payment_status == "completed"
    )

    total_paid = repayments.with_entities(
        func.coalesce(func.sum(Repayment.amount_paid), 0)
    ).scalar()

    recent_applications = applications.order_by(
        LoanApplication.application_date.desc(),
        LoanApplication.application_id.desc()
    ).limit(5).all()

    return jsonify({
        "member": member.to_dict(),
        "applications": {
            "total": sum(application_counts.values()),
            "by_status": {
                status: application_counts.get(status, 0)
                for status in (
                    "pending", "approved", "rejected", "cancelled"
                )
            }
        },
        "loans": {
            "total": sum(loan_counts.values()),
            "active_count": loan_counts.get("active", 0),
            "total_outstanding_balance": float(outstanding_balance or 0),
            "by_status": {
                status: loan_counts.get(status, 0)
                for status in (
                    "active", "completed", "overdue", "defaulted"
                )
            }
        },
        "repayments": {
            "total_amount_paid": float(total_paid or 0)
        },
        "recent_applications": [
            application.to_dict()
            for application in recent_applications
        ]
    }), 200
