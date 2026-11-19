
from flask import Flask
from config import Config
from extensions import db, migrate, jwt, cors


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)

    from app import models
    from app.routes.auth import auth_bp
    from app.routes.members import members_bp
    from app.routes.loan_applications import loan_applications_bp
    from app.routes.assessments import assessments_bp
    from app.routes.loan_decisions import loan_decisions_bp
    from app.routes.repayments import repayments_bp
    from app.routes.predictions import predictions_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.admin import admin_bp
    from app.routes.officer import officer_bp
    from app.routes.notifications import notifications_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(members_bp)
    app.register_blueprint(loan_applications_bp)
    app.register_blueprint(assessments_bp)
    app.register_blueprint(loan_decisions_bp)
    app.register_blueprint(repayments_bp)
    app.register_blueprint(predictions_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(officer_bp)
    app.register_blueprint(notifications_bp)

    @app.get("/")
    def home():
        return {
            "message": "Cooperative Loan Management System API",
            "status": "running"
        }

    return app
