from extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    notification_id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    title = db.Column(
        db.String(150),
        nullable=False
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    notification_type = db.Column(
        db.String(50),
        nullable=False
    )

    related_id = db.Column(
        db.Integer,
        nullable=True
    )

    is_read = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        server_default=db.false()
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.current_timestamp()
    )

    def to_dict(self):
        return {
            "notification_id": self.notification_id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "related_id": self.related_id,
            "is_read": self.is_read,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }