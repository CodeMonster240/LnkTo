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
#
# IMPORTANT: We deliberately read LNKTO_DATABASE_URL (not DATABASE_URL)
# because PythonAnywhere automatically exports DATABASE_URL on every
# account, pointing at their bundled MySQL DB. If we honoured that var
# without the user explicitly opting in, the app would try to import
# pymysql and crash on accounts that haven't set it up.
_DEFAULT_DB_DIR = os.path.join(
    os.environ.get('HOME', APPLICATION_DIR), 'LnkTo_data'
)
DB_DIR = os.environ.get('LNKTO_DB_DIR', _DEFAULT_DB_DIR)
try:
    os.makedirs(DB_DIR, exist_ok=True)
except OSError:
    # Fall back to project dir if we can't create the target folder.
    DB_DIR = APPLICATION_DIR
SQLALCHEMY_DATABASE_URI = os.environ.get(
    'LNKTO_DATABASE_URL',
    'sqlite:///' + os.path.join(DB_DIR, 'shortener.db'),
)
SQLALCHEMY_TRACK_MODIFICATIONS = False

# --- Static ------------------------------------------------------------------
STATIC_DIR = os.path.join(APPLICATION_DIR, 'static')

# --- Server name -------------------------------------------------------------
# Flask's url_for() uses SERVER_NAME (when set) to build absolute URLs.
# We only want it set for the LOCAL dev server (so links look like
# http://localhost:5001/...). On any deployed environment — PythonAnywhere,
# Render, anywhere else — it must be None so Flask uses the actual request
# host (e.g. https://you.pythonanywhere.com).
#
# We treat the app as "production" if ANY of these are true:
#   - FLASK_ENV=production
#   - DEBUG=0 or unset
# Otherwise it's a local dev server.
_IS_PROD = (
    os.environ.get('FLASK_ENV', '').lower() == 'production'
    or os.environ.get('LNKTO_ENV', '').lower() == 'production'
    or os.environ.get('DEBUG', '1') == '0'
)
if _IS_PROD:
    SERVER_NAME = None
else:
    SERVER_NAME = os.environ.get('SERVER_NAME', 'localhost:5001')