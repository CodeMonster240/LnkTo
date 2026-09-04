import os
import sys
sys.path.append(os.getcwd())
from app import app, db

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    print("Database created at:", app.config['SQLALCHEMY_DATABASE_URI'])