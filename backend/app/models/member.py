
from extensions import db


class Member(db.Model):
    __tablename__ = "members"

    member_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False,
        unique=True
    )
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    gender = db.Column(db.String(20))
    date_of_birth = db.Column(db.Date)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.String(255))
    membership_date = db.Column(db.Date, nullable=False)
    membership_status = db.Column(
        db.Enum("active", "inactive"),
        nullable=True,
        default="active"
    )

    user = db.relationship(
        "User",
        backref=db.backref("member", uselist=False)
    )

    def to_dict(self):
        return {
            "member_id": self.member_id,
            "user_id": self.user_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "gender": self.gender,
            "date_of_birth": (
                self.date_of_birth.isoformat()
                if self.date_of_birth else None
            ),
            "phone": self.phone,
            "email": self.email,
            "address": self.address,
            "membership_date": (
                self.membership_date.isoformat()
                if self.membership_date else None
            ),
            "membership_status": self.membership_status
        }
