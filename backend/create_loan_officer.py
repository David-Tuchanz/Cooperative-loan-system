
import getpass

from app import create_app
from app.models import User
from extensions import db
from werkzeug.security import generate_password_hash


app = create_app()

with app.app_context():
    username = input("Enter loan officer username: ").strip()
    email = input("Enter loan officer email: ").strip()
    password = getpass.getpass("Enter loan officer password: ")
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
        loan_officer = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            role="loan_officer",
            status="active"
        )

        db.session.add(loan_officer)
        db.session.commit()

        print("Loan officer account created successfully.")
