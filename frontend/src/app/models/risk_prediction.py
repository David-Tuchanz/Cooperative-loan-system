
from extensions import db


class RiskPrediction(db.Model):
    __tablename__ = "risk_predictions"

    prediction_id = db.Column(
        db.Integer, primary_key=True, autoincrement=True
    )

    application_id = db.Column(
        db.Integer,
        db.ForeignKey("loan_applications.application_id"),
        nullable=False
    )

    default_probability = db.Column(
        db.Numeric(5, 4), nullable=False
    )

    risk_level = db.Column(
        db.Enum("Low", "Medium", "High"),
        nullable=False
    )

    model_name = db.Column(db.String(100))

    prediction_date = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    model_version = db.Column(db.String(50))
    input_snapshot = db.Column(db.JSON)

    application = db.relationship(
        "LoanApplication",
        backref="risk_predictions"
    )

    def to_dict(self):
        return {
            "prediction_id": self.prediction_id,
            "application_id": self.application_id,
            "default_probability": (
                float(self.default_probability)
                if self.default_probability is not None else None
            ),
            "risk_level": self.risk_level,
            "model_name": self.model_name,
            "prediction_date": (
                self.prediction_date.isoformat()
                if self.prediction_date else None
            ),
            "model_version": self.model_version,
            "input_snapshot": self.input_snapshot
        }
