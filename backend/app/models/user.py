
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum("admin", "loan_officer", "member"),
        nullable=False
    )
    status = db.Column(
        db.Enum("active", "inactive"),
        nullable=True,
        default="active"
    )
    created_at = db.Column(
        db.DateTime,
        nullable=True,
        server_default=db.func.current_timestamp()
    )

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "status": self.status,
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            )
        }
