
from sqlalchemy import text
from app import create_app
from extensions import db

app = create_app()

with app.app_context():
    try:
        db.session.execute(text("SELECT 1"))
        print("SUCCESS: Connected to MySQL database!")
        print("Database:", db.session.execute(
            text("SELECT DATABASE()")
        ).scalar())
    except Exception as error:
        print("DATABASE CONNECTION FAILED")
        print(error)
