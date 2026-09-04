"""
WSGI entry point for production servers (PythonAnywhere, gunicorn, etc.).

This file is what *your code* exposes as a WSGI app. PythonAnywhere's
own /var/www/<user>_pythonanywhere_com_wsgi.py file imports from here
via:

    sys.path.insert(0, '/home/<yourusername>/LnkTo')
    from wsgi import app as application

You cannot move or rename the /var/www/ file (PythonAnywhere hardcodes
its location), but you don't need to — you only edit *this* file when
you change your project's imports, config, or routes.

Locally you don't need this file — run ``python run.py`` instead.
"""
import sys
import os

# Make sure the project root is importable when this file is executed by
# the WSGI server. On PythonAnywhere the project lives in /home/<user>/...
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Load environment variables from a .env file BEFORE importing anything
# that reads os.environ (settings.py reads SECRET_KEY, DEBUG, DB_DIR,
# etc. at module import time).
#
# This is the PythonAnywhere-recommended way to handle SECRET_KEY on
# free accounts, where the Web tab's "Environment variables" box only
# accepts HTTP_* whitelisted vars. See .env.example for the format.
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(os.path.join(PROJECT_ROOT, '.env'))
except ImportError:
    # python-dotenv is not installed; settings.py falls back to defaults.
    pass

# Import the Flask app instance from app.py
from app import app  # noqa: E402

# IMPORTANT: the routes are registered as decorators on the `app` object
# inside the `url` package. Importing them here is what actually attaches
# them to the app. Without these, every request returns 404.
import url.views   # noqa: E402, F401  -- side-effect: registers routes
import url.models  # noqa: E402, F401  -- side-effect: registers the model

# The WSGI standard name that PythonAnywhere / gunicorn look for
application = app