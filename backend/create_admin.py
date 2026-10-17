
import getpass

from app import create_app
from app.models import User
from extensions import db
from werkzeug.security import generate_password_hash


app = create_app()

with app.app_context():
    existing_admin = User.query.filter_by(role="admin").first()

    if existing_admin:
        print("An administrator account already exists.")
    else:
        username = input("Enter administrator username: ").strip()
        email = input("Enter administrator email: ").strip()
        password = getpass.getpass("Enter administrator password: ")
        confirm_password = getpass.getpass("Confirm password: ")

        if not username or not email or not password:
            print("All fields are required.")
        elif password != confirm_password:
            print("Passwords do not match.")
        elif len(password) < 12:
            print("Use a password of at least 12 characters.")
        elif User.query.filter_by(username=username).first():
            print("That username already exists.")
        elif User.query.filter_by(email=email).first():
            print("That email already exists.")
        else:
            admin = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
                role="admin",
                status="active"
            )

            db.session.add(admin)
            db.session.commit()

            print("Administrator account created successfully.")
