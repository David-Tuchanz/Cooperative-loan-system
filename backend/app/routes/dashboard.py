
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from extensions import db
from app.models import LoanApplication, Loan, Repayment, RiskPrediction
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
