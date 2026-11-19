from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from app.models import Notification
from app.routes.permissions import role_required


notifications_bp = Blueprint(
    "notifications",
    __name__,
    url_prefix="/api/notifications"
)


@notifications_bp.get("/")
@jwt_required()
@role_required("member")
def get_notifications():
    user_id = int(get_jwt_identity())

    notifications = (
        Notification.query
        .filter_by(user_id=user_id)
        .order_by(
            Notification.created_at.desc(),
            Notification.notification_id.desc()
        )
        .all()
    )

    unread_count = Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).count()

    return jsonify({
        "count": len(notifications),
        "unread_count": unread_count,
        "notifications": [
            notification.to_dict()
            for notification in notifications
        ]
    }), 200


@notifications_bp.patch("/<int:notification_id>/read")
@jwt_required()
@role_required("member")
def mark_notification_read(notification_id):
    user_id = int(get_jwt_identity())

    notification = Notification.query.filter_by(
        notification_id=notification_id,
        user_id=user_id
    ).first()

    if notification is None:
        return jsonify({
            "message": "Notification not found."
        }), 404

    notification.is_read = True
    db.session.commit()

    return jsonify({
        "message": "Notification marked as read.",
        "notification": notification.to_dict()
    }), 200


@notifications_bp.patch("/read-all")
@jwt_required()
@role_required("member")
def mark_all_notifications_read():
    user_id = int(get_jwt_identity())

    Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).update(
        {"is_read": True},
        synchronize_session=False
    )

    db.session.commit()

    return jsonify({
        "message": "All notifications marked as read."
    }), 200