
from datetime import date
import os
import cloudinary
import cloudinary.uploader
import cloudinary.api


from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash

from extensions import db
from app.models import Member, User, LoanApplication, Loan, Repayment
from flask_jwt_extended import get_jwt_identity
from app.routes.permissions import role_required


cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)
members_bp = Blueprint("members", __name__, url_prefix="/api/members")


@members_bp.get("/")
@jwt_required()
@role_required("admin", "loan_officer")
def list_members():
    members = Member.query.order_by(Member.member_id.desc()).all()

    return jsonify({
        "count": len(members),
        "members": [member.to_dict() for member in members]
    }), 200


@members_bp.get("/<int:member_id>")
@jwt_required()
@role_required("admin", "loan_officer")
def get_member(member_id):
    member = db.session.get(Member, member_id)

    if member is None:
        return jsonify({"message": "Member not found."}), 404

    return jsonify(member.to_dict()), 200


@members_bp.post("/")
@jwt_required()
@role_required("admin", "loan_officer")
def register_member():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON body is required."}), 400

    required_fields = [
        "username",
        "password",
        "first_name",
        "last_name",
        "membership_date"
    ]

    missing_fields = [
        field for field in required_fields
        if not data.get(field)
    ]

    if missing_fields:
        return jsonify({
            "message": "Required fields are missing.",
            "fields": missing_fields
        }), 400

    username = data["username"].strip()
    email = data.get("email")
    email = email.strip() if isinstance(email, str) else email
    password = data["password"]

    if not isinstance(password, str) or len(password) < 12:
        return jsonify({
            "message": "Password must contain at least 12 characters."
        }), 400

    if not username:
        return jsonify({"message": "Username cannot be empty."}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists."}), 409

    if email and User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists."}), 409

    try:
        membership_date = date.fromisoformat(data["membership_date"])
    except (TypeError, ValueError):
        return jsonify({
            "message": "membership_date must use YYYY-MM-DD format."
        }), 400

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role="member",
        status="active"
    )

    try:
        db.session.add(user)
        db.session.flush()

        member = Member(
            user_id=user.user_id,
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
            gender=data.get("gender"),
            date_of_birth=data.get("date_of_birth"),
            phone=data.get("phone"),
            email=email,
            address=data.get("address"),
            membership_date=membership_date,
            membership_status="active"
        )

        db.session.add(member)
        db.session.commit()

        return jsonify({
            "message": "Member registered successfully.",
            "member": member.to_dict()
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "Registration failed because a username, email, or linked record conflicts with existing data."
        }), 409

    except Exception:
        db.session.rollback()
        raise

@members_bp.get("/me/dashboard")
@jwt_required()
@role_required("member")
def get_member_dashboard():
    user_id = int(get_jwt_identity())

    member = Member.query.filter_by(user_id=user_id).first()

    if member is None:
        return jsonify({
            "message": "No member profile is linked to this account."
        }), 404

    applications = (
        LoanApplication.query
        .filter_by(member_id=member.member_id)
        .order_by(LoanApplication.application_id.desc())
        .all()
    )

    loans = (
        Loan.query
        .join(
            LoanApplication,
            Loan.application_id == LoanApplication.application_id
        )
        .filter(LoanApplication.member_id == member.member_id)
        .order_by(Loan.loan_id.desc())
        .all()
    )

    repayments = (
        Repayment.query
        .join(Loan, Repayment.loan_id == Loan.loan_id)
        .join(
            LoanApplication,
            Loan.application_id == LoanApplication.application_id
        )
        .filter(LoanApplication.member_id == member.member_id)
        .order_by(Repayment.payment_date.desc())
        .all()
    )

    active_loans = [
        loan for loan in loans
        if loan.loan_status == "active"
    ]

    total_outstanding = sum(
        (loan.outstanding_balance or 0 for loan in active_loans),
        start=0
    )

    return jsonify({
        "member": member.to_dict(),
        "summary": {
            "total_applications": len(applications),
            "approved_applications": sum(
                1 for application in applications
                if application.application_status == "approved"
            ),
            "pending_applications": sum(
                1 for application in applications
                if application.application_status == "pending"
            ),
            "active_loans": len(active_loans),
            "total_outstanding_balance": float(total_outstanding)
        },
        "applications": [
            application.to_dict() for application in applications
        ],
        "loans": [
            {
                **loan.to_dict(),
                "repayments": [
                    repayment.to_dict()
                    for repayment in loan.repayments
                ]
            }
            for loan in loans
        ],
        "repayments": [
            repayment.to_dict() for repayment in repayments
        ]
    }), 200
    
@members_bp.get("/me/profile")
@jwt_required()
@role_required("member")
def get_my_profile():
    user_id = int(get_jwt_identity())

    member = Member.query.filter_by(user_id=user_id).first()

    if member is None:
        return jsonify({"message": "Member profile not found."}), 404

    user = db.session.get(User, user_id)

    public_id = (
        f"concord/profile-pictures/member_{member.member_id}"
    )

    picture_url = None

    try:
        resource = cloudinary.api.resource(
            public_id,
            resource_type="image"
        )

        picture_url = resource.get("secure_url")

    except Exception:
        # No uploaded picture was found, or Cloudinary could not
        # retrieve the resource. The rest of the profile can still load.
        picture_url = None

    profile = {
        **member.to_dict(),
        "username": user.username if user else "",
        "email": member.email or (user.email if user else ""),
        "profile_picture_url": picture_url
    }

    return jsonify({
        "profile": profile
    }), 200

@members_bp.put("/me/profile")
@jwt_required()
@role_required("member")
def update_my_profile():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "A valid JSON body is required."}), 400

    member = Member.query.filter_by(user_id=user_id).first()
    user = db.session.get(User, user_id)

    if member is None or user is None:
        return jsonify({"message": "Member profile not found."}), 404

    first_name = data.get("first_name", member.first_name)
    last_name = data.get("last_name", member.last_name)
    email = data.get("email", user.email)
    phone = data.get("phone", member.phone)
    address = data.get("address", member.address)
    gender = data.get("gender", member.gender)
    dob_value = data.get("date_of_birth", member.date_of_birth)

    for field, value in [
        ("first_name", first_name),
        ("last_name", last_name),
        ("email", email),
    ]:
        if not isinstance(value, str) or not value.strip():
            return jsonify({
                "message": f"{field} cannot be empty."
            }), 400

    first_name = first_name.strip()
    last_name = last_name.strip()
    email = email.strip().lower()

    if len(first_name) > 50 or len(last_name) > 50:
        return jsonify({
            "message": "Names must not exceed 50 characters."
        }), 400

    if len(email) > 100 or "@" not in email:
        return jsonify({"message": "Enter a valid email address."}), 400

    existing_user = User.query.filter(
        User.email == email,
        User.user_id != user_id
    ).first()

    if existing_user:
        return jsonify({
            "message": "That email address is already in use."
        }), 409

    if phone is not None:
        if not isinstance(phone, str) or len(phone) > 20:
            return jsonify({"message": "Invalid phone number."}), 400
        phone = phone.strip() or None

    if address is not None:
        if not isinstance(address, str) or len(address) > 255:
            return jsonify({"message": "Invalid address."}), 400
        address = address.strip() or None

    if gender is not None:
        if not isinstance(gender, str) or len(gender) > 20:
            return jsonify({"message": "Invalid gender value."}), 400
        gender = gender.strip() or None

    try:
        if isinstance(dob_value, str):
            dob_value = (
                date.fromisoformat(dob_value) if dob_value else None
            )

        if dob_value and dob_value > date.today():
            return jsonify({
                "message": "Date of birth cannot be in the future."
            }), 400

    except (TypeError, ValueError):
        return jsonify({
            "message": "Date of birth must use YYYY-MM-DD format."
        }), 400

    member.first_name = first_name
    member.last_name = last_name
    member.email = email
    member.phone = phone
    member.address = address
    member.gender = gender
    member.date_of_birth = dob_value
    user.email = email

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "The profile could not be updated due to a data conflict."
        }), 409

    return jsonify({
        "message": "Profile updated successfully.",
        "member": member.to_dict(),
        "user": user.to_dict()
    }), 200


@members_bp.post("/me/profile-picture")
@jwt_required()
@role_required("member")
def upload_my_profile_picture():
    user_id = int(get_jwt_identity())
    member = Member.query.filter_by(user_id=user_id).first()

    if member is None:
        return jsonify({"message": "Member profile not found."}), 404

    image = request.files.get("profile_picture")

    if image is None or not image.filename:
        return jsonify({
            "message": "Select a profile picture to upload."
        }), 400

    allowed_types = {"image/jpeg", "image/png", "image/webp"}

    if image.mimetype not in allowed_types:
        return jsonify({
            "message": "Use a JPG, PNG, or WebP image."
        }), 400

    image_bytes = image.read()

    if not image_bytes:
        return jsonify({"message": "The image is empty."}), 400

    if len(image_bytes) > 5 * 1024 * 1024:
        return jsonify({
            "message": "The image must not exceed 5 MB."
        }), 400

    if not all([
        os.getenv("CLOUDINARY_CLOUD_NAME"),
        os.getenv("CLOUDINARY_API_KEY"),
        os.getenv("CLOUDINARY_API_SECRET")
    ]):
        return jsonify({
            "message": "Profile picture storage is not configured."
        }), 503

    try:
        result = cloudinary.uploader.upload(
            image_bytes,
            public_id=f"concord/profile-pictures/member_{member.member_id}",
            overwrite=True,
            invalidate=True,
            resource_type="image",
            allowed_formats=["jpg", "jpeg", "png", "webp"],
            transformation=[
                {"width": 500, "height": 500, "crop": "fill", "gravity": "face"}
            ]
        )

        return jsonify({
            "message": "Profile picture uploaded successfully.",
            "profile_picture_url": result["secure_url"]
        }), 200

    except Exception:
        return jsonify({
            "message": "Unable to upload the picture. Please try again."
        }), 502
