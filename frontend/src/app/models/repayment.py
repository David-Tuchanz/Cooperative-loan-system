
from extensions import db


class Repayment(db.Model):
    __tablename__ = "repayments"

    repayment_id = db.Column(
        db.Integer, primary_key=True, autoincrement=True
    )
    loan_id = db.Column(
        db.Integer,
        db.ForeignKey("loans.loan_id"),
        nullable=False
    )
    payment_date = db.Column(db.Date, nullable=False)
    amount_paid = db.Column(db.Numeric(15, 2), nullable=False)
    payment_method = db.Column(db.String(50))

    payment_status = db.Column(
        db.Enum("completed", "pending", "failed"),
        default="completed",
        server_default="completed"
    )

    remaining_balance = db.Column(db.Numeric(15, 2))

    recorded_by = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id")
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    loan = db.relationship("Loan", backref="repayments")
    recorder = db.relationship(
        "User",
        foreign_keys=[recorded_by],
        backref="recorded_repayments"
    )

    def to_dict(self):
        return {
            "repayment_id": self.repayment_id,
            "loan_id": self.loan_id,
            "payment_date": (
                self.payment_date.isoformat()
                if self.payment_date else None
            ),
            "amount_paid": (
                float(self.amount_paid)
                if self.amount_paid is not None else None
            ),
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "remaining_balance": (
                float(self.remaining_balance)
                if self.remaining_balance is not None else None
            ),
            "recorded_by": self.recorded_by,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }
