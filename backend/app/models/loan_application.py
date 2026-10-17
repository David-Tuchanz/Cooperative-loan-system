
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
    loan_purpose = db.Column(db.String(100))
    loan_term = db.Column(db.Integer)
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

    member = db.relationship("Member", backref="loan_applications")
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
            "loan_purpose": self.loan_purpose,
            "loan_term": self.loan_term,
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
            "submission_method": self.submission_method
        }
