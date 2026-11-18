
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {
            "ssl_verify_cert": True,
            "ssl_verify_identity": True,
            "ssl_ca": os.getenv("SSL_CA_PATH", "/etc/ssl/certs/ca-certificates.crt"),
        },
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-key-change-me")


# JWT settings
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
