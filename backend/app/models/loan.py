
from extensions import db


class Loan(db.Model):
    __tablename__ = "loans"

    loan_id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    application_id = db.Column(
        db.Integer,
        db.ForeignKey("loan_applications.application_id"),
        nullable=False,
        unique=True
    )

    amount_approved = db.Column(db.Numeric(15, 2), nullable=False)
    interest_rate = db.Column(db.Numeric(5, 2))
    disbursement_date = db.Column(db.Date)
    amount_due = db.Column(db.Numeric(15, 2))
    outstanding_balance = db.Column(db.Numeric(15, 2))

    loan_status = db.Column(
        db.Enum("active", "completed", "overdue", "defaulted"),
        default="active",
        server_default="active"
    )

    application = db.relationship(
        "LoanApplication",
        backref=db.backref("loan", uselist=False)
    )

    def to_dict(self):
        return {
            "loan_id": self.loan_id,
            "application_id": self.application_id,
            "amount_approved": (
                float(self.amount_approved)
                if self.amount_approved is not None else None
            ),
            "interest_rate": (
                float(self.interest_rate)
                if self.interest_rate is not None else None
            ),
            "disbursement_date": (
                self.disbursement_date.isoformat()
                if self.disbursement_date else None
            ),
            "amount_due": (
                float(self.amount_due) if self.amount_due is not None else None
            ),
            "outstanding_balance": (
                float(self.outstanding_balance)
                if self.outstanding_balance is not None else None
            ),
            "loan_status": self.loan_status
        }
