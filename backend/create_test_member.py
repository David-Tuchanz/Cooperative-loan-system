
from getpass import getpass
from datetime import date

from werkzeug.security import generate_password_hash

from app import create_app
from extensions import db
from app.models import User, Member


app = create_app()

with app.app_context():
    username = "test_member"
    email = "test_member@example.com"

    existing = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing:
        print("The test account already exists.")
        print(f"Username: {existing.username}")
        print(f"User ID: {existing.user_id}")
        raise SystemExit

    password = getpass("Create a password for test_member: ")
    confirm = getpass("Confirm password: ")

    if len(password) < 8 or password != confirm:
        raise SystemExit("Passwords must match and contain at least 8 characters.")

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role="member",
        status="active",
    )

    try:
        db.session.add(user)
        db.session.flush()

        member = Member(
            user_id=user.user_id,
            first_name="Test",
            last_name="Member",
            gender="Other",
            date_of_birth=date(1995, 1, 1),
            email=email,
            membership_date=date.today(),
            membership_status="active",
            member_category="Regular",
            cooperative_unit="General",
            cooperative_id=None,
        )

        db.session.add(member)
        db.session.commit()

        print("Test member created successfully.")
        print(f"Username: {username}")
        print(f"User ID: {user.user_id}")
        print(f"Member ID: {member.member_id}")

    except Exception:
        db.session.rollback()
        raise
