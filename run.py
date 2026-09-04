"""
One-shot local starter — like ``npm start``.

What it does, in order:
  1. Creates the SQLite tables if they don't exist yet (idempotent).
  2. Starts Flask's built-in dev server on 0.0.0.0:5001.

Usage:
    python run.py

Override host/port via env vars if you want:
    HOST=0.0.0.0 PORT=8000 python run.py
"""
import os
import sys

# Make sure relative imports ("url.views", etc.) work no matter how
# this script is launched.
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from app import app, db  # noqa: E402

# Register the routes that live in the url package. Without these imports
# the routes are never attached to the Flask object and every request 404s.
import url.views   # noqa: E402, F401  -- side-effect: registers routes
import url.models  # noqa: E402, F401  -- side-effect: registers the model

# Load .env from the project root if present, so SECRET_KEY etc. can be
# configured locally the same way they are in production.
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(os.path.join(HERE, '.env'))
except ImportError:
    pass


def init_db():
    """Create tables if missing — safe to call every time."""
    with app.app_context():
        db.create_all()
    print(f"[run.py] DB ready: {app.config['SQLALCHEMY_DATABASE_URI']}")


if __name__ == "__main__":
    init_db()
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5001"))
    debug = os.environ.get("DEBUG", "1") == "1"
    print(f"[run.py] Starting Flask on http://{host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)