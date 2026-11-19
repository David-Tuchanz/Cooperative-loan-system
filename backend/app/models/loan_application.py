
from extensions import db


class LoanApplication(db.Model):
    __tablename__ = "loan_applications"

    application_id = db.Column(
        db.Integer, primary_key=True, autoincrement=True
    )

    member_id = db.Column(
        db.Integer,
        db.ForeignKey("members.member_id"),
        nullable=False
    )

    submitted_by = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    amount_requested = db.Column(db.Numeric(15, 2), nullable=False)
    loan_type = db.Column(db.String(100))
    loan_purpose = db.Column(db.String(100))
    loan_term = db.Column(db.Integer)
    interest_rate = db.Column(db.Numeric(7, 4))
    repayment_frequency = db.Column(db.String(30))

    application_date = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    application_status = db.Column(
        db.Enum("pending", "approved", "rejected", "cancelled"),
        server_default="pending"
    )

    decision_date = db.Column(db.DateTime)

    decision_by = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id")
    )

    submission_method = db.Column(
        db.Enum("member_self_service", "officer_assisted"),
        nullable=False,
        server_default="member_self_service"
    )

    # Applicant declarations
    legal_age_confirmed = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false()
    )

    terms_accepted = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false()
    )

    terms_version = db.Column(db.String(20))

    terms_accepted_at = db.Column(db.DateTime)

    member = db.relationship(
        "Member",
        backref="loan_applications"
    )

    submitter = db.relationship(
        "User",
        foreign_keys=[submitted_by],
        backref="submitted_applications"
    )

    decision_maker = db.relationship(
        "User",
        foreign_keys=[decision_by],
        backref="decided_applications"
    )

    def to_dict(self):
        return {
            "application_id": self.application_id,
            "member_id": self.member_id,
            "submitted_by": self.submitted_by,

            "amount_requested": (
                float(self.amount_requested)
                if self.amount_requested is not None else None
            ),

            "loan_type": self.loan_type,
            "loan_purpose": self.loan_purpose,
            "loan_term": self.loan_term,

            "interest_rate": (
                float(self.interest_rate)
                if self.interest_rate is not None else None
            ),

            "repayment_frequency": self.repayment_frequency,

            "application_date": (
                self.application_date.isoformat()
                if self.application_date else None
            ),

            "application_status": self.application_status,

            "decision_date": (
                self.decision_date.isoformat()
                if self.decision_date else None
            ),

            "decision_by": self.decision_by,
            "submission_method": self.submission_method,

            "legal_age_confirmed": self.legal_age_confirmed,
            "terms_accepted": self.terms_accepted,
            "terms_version": self.terms_version,

            "terms_accepted_at": (
                self.terms_accepted_at.isoformat()
                if self.terms_accepted_at else None
            )
        }
