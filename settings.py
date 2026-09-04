import os

APPLICATION_DIR = os.path.dirname(os.path.realpath(__file__))

# --- Production-safe defaults -------------------------------------------------
# Anything you want to change per environment should be set via env vars
# (PythonAnywhere: "Web" tab → "Environment variables" / .env locally).
#
#   SECRET_KEY  -> MUST be set in production. A static string here is fine
#                  for local dev but should never ship to a public host.
#   DEBUG        -> "1" to enable Flask debug mode, anything else disables it.
#   DB_DIR       -> folder for the SQLite file. Defaults to ~/LnkTo_data on
#                   PythonAnywhere, project dir elsewhere.

# SECRET_KEY fallback for local dev only. In production PythonAnywhere will
# inject a real SECRET_KEY through the webapp's env vars.
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'dev-only-change-me-please'
)

DEBUG = os.environ.get('DEBUG', '1') == '1'

# --- Database -----------------------------------------------------------------
# Put the DB under a writable folder that survives git pulls / webapp
# reloads. On PythonAnywhere HOME=/home/<user> is always writable.
_DEFAULT_DB_DIR = os.path.join(
    os.environ.get('HOME', APPLICATION_DIR), 'LnkTo_data'
)
DB_DIR = os.environ.get('DB_DIR', _DEFAULT_DB_DIR)
try:
    os.makedirs(DB_DIR, exist_ok=True)
except OSError:
    # Fall back to project dir if we can't create the target folder.
    DB_DIR = APPLICATION_DIR
SQLALCHEMY_DATABASE_URI = os.environ.get(
    'DATABASE_URL',
    'sqlite:///' + os.path.join(DB_DIR, 'shortener.db'),
)
SQLALCHEMY_TRACK_MODIFICATIONS = False

# --- Static ------------------------------------------------------------------
STATIC_DIR = os.path.join(APPLICATION_DIR, 'static')

# --- Server name -------------------------------------------------------------
# Only force SERVER_NAME for the local dev server (so url_for() produces
# http://localhost:5001/...). Leave it unset in production so Flask uses the
# actual request host (e.g. https://you.pythonanywhere.com).
if os.environ.get('FLASK_ENV') != 'production':
    SERVER_NAME = os.environ.get('SERVER_NAME', 'localhost:5001')
else:
    SERVER_NAME = None