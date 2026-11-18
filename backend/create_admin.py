from getpass import getpass
from werkzeug.security import generate_password_hash

from app import create_app
from extensions import db
from app.models import User

app = create_app()

with app.app_context():
    username = input("Admin username: ").strip()
    email = input("Admin email: ").strip().lower()
    password = getpass("Admin password (min 12 characters): ")

    if len(password) < 12:
        print("Password too short. Nothing was created.")
        raise SystemExit

    if User.query.filter_by(username=username).first():
        print("That username already exists. Nothing was created.")
        raise SystemExit

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role="admin",
        status="active",
    )
    db.session.add(user)
    db.session.commit()
    print(f"Admin created with user_id {user.user_id}.")