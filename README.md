# Flask URL-Shortener

[Live Demo](https://glowsquid.com/url/) (on a not-so-short URL)

## Features

- Shortens URLs to a default 3-digit prefix using a random character and letter combination.
- Checks if the shortened URL already exists and attempts to re-run the code-generator until it finds an available combination.
- All data is stored in a single **SQLite** file (`shortener.db`) — zero database setup.
- Case-sensitive. SQLite stores the values exactly as written.
- A Stats page lists all the shortened URLs, and shows how many times a target link has been redirected.
- There is a button to automatically copy the shortened URL to clipboard.
- Uses **ALTCHA** for spam protection — a free, open-source proof-of-work CAPTCHA that requires **no API key, account, or external service** (https://altcha.org).

![Screenshot](https://github.com/GlowSquid/Flask-URL-Shortener/blob/master/screenshot.gif)

## Setup

- Create a virtualenv
- Install the requirements `pip install -r requirements.txt`
- No credentials to configure — `settings.py` already points at a local `shortener.db` file.
- Run the app with `python run.py` (creates the table if missing and starts the dev server).

### One-liner

If you just want the "npm start" equivalent, run:

```bash
./start.sh
```

Or, on any machine:

```bash
python run.py
```

That's it. The SQLite database file is created automatically alongside the app on first run.

## Hosting on PythonAnywhere

See [`pythonanywhere.md`](./pythonanywhere.md) for the full step-by-step
(WSGI setup, virtualenv, environment variables, static files, troubleshooting).