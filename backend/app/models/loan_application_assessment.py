
from extensions import db


class LoanApplicationAssessment(db.Model):
    __tablename__ = "loan_application_assessment"

    assessment_id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    application_id = db.Column(
        db.Integer,
        db.ForeignKey("loan_applications.application_id"),
        nullable=False,
        unique=True
    )

    employment_status = db.Column(db.String(50))
    occupation = db.Column(db.String(100))

    monthly_income = db.Column(db.Numeric(15, 2))
    existing_monthly_obligation = db.Column(db.Numeric(15, 2))
    savings_balance = db.Column(db.Numeric(15, 2))
    share_value = db.Column(db.Numeric(15, 2))

    # Contribution information
    monthly_contribution = db.Column(db.Numeric(15, 2))
    contribution_frequency = db.Column(db.String(50))
    contribution_status = db.Column(db.String(50))
    total_contributions = db.Column(db.Numeric(15, 2))

    previous_loan_count = db.Column(db.Integer)
    previous_default_count = db.Column(db.Integer)
    previous_repayment_rate = db.Column(db.Numeric(7, 6))

    marital_status = db.Column(db.String(30))
    number_of_dependents = db.Column(db.Integer)

    collateral_type = db.Column(db.String(50))
    collateral_value = db.Column(db.Numeric(15, 2))
    guarantor_count = db.Column(db.Integer)

    created_by = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    updated_by = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id")
    )

    created_at = db.Column(
        db.TIMESTAMP,
        server_default=db.func.current_timestamp()
    )

    updated_at = db.Column(
        db.TIMESTAMP,
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp()
    )

    application = db.relationship(
        "LoanApplication",
        backref=db.backref("assessment", uselist=False)
    )

    creator = db.relationship(
        "User",
        foreign_keys=[created_by],
        backref="created_assessments"
    )

    updater = db.relationship(
        "User",
        foreign_keys=[updated_by],
        backref="updated_assessments"
    )

    def to_dict(self):
        fields = [
            "assessment_id",
            "application_id",
            "employment_status",
            "occupation",
            "monthly_income",
            "existing_monthly_obligation",
            "savings_balance",
            "share_value",
            "monthly_contribution",
            "contribution_frequency",
            "contribution_status",
            "total_contributions",
            "previous_loan_count",
            "previous_default_count",
            "previous_repayment_rate",
            "marital_status",
            "number_of_dependents",
            "collateral_type",
            "collateral_value",
            "guarantor_count",
            "created_by",
            "updated_by"
        ]

        result = {}

        for field in fields:
            value = getattr(self, field)

            if value is not None and hasattr(value, "as_tuple"):
                value = float(value)

            result[field] = value

        result["created_at"] = (
            self.created_at.isoformat()
            if self.created_at else None
        )

        result["updated_at"] = (
            self.updated_at.isoformat()
            if self.updated_at else None
        )

        return result
