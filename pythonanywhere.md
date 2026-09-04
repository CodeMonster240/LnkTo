# Hosting LnkTo on PythonAnywhere

PythonAnywhere is a WSGI host, not a process host — there is no
`flask run`, no open ports, and no shell command keeps the server alive.
The web app is a Python WSGI module that gets reloaded on file change.

## Heads-up about the free tier

The Web tab's "Environment variables" box is **restricted on free
accounts** — it only accepts HTTP_* prefixed names. Custom variables
like `SECRET_KEY`, `DEBUG`, `FLASK_ENV` won't appear as a field on free.

The official PythonAnywhere workaround (per their own help docs) is to
store those values in a `.env` file and load them via `python-dotenv`.
That's exactly what this project does — `wsgi.py` calls
`load_dotenv('.env')` before importing the app.

## Important: the WSGI file path is fixed

You **cannot** change where PythonAnywhere looks for your WSGI file.
Per PythonAnywhere staff: *"You cannot move or rename the file. The
name and location of the file are how the web app knows which file
goes with which web app."* (https://www.pythonanywhere.com/forums/topic/13523/)

What you *can* do: **edit the contents** of the fixed file at
`/var/www/<yourusername>_pythonanywhere_com_wsgi.py` so it imports
from your project. PythonAnywhere auto-generates this file when you
add a web app — it should already contain something like:

```python
import sys
project_home = '/home/<yourusername>/LnkTo'
if project_home not in sys.path:
    sys.path.insert(0, project_home)
from wsgi import app as application
```

If yours doesn't, edit it to match (use the **Files** tab → navigate to
`/var/www/` → click the file → replace contents).

---

## 1. Get an account + a console

1. Sign up at https://www.pythonanywhere.com (free tier works fine).
2. **Consoles** tab → start a **Bash** console. All commands below run there.

## 2. Clone the code

```bash
cd ~
git clone https://github.com/CodeMonster240/LnkTo.git LnkTo
cd LnkTo
```

## 3. Create a virtualenv and install deps

```bash
mkvirtualenv --python=python3.12 lnkto-venv
pip install -r requirements.txt
```

> `mkvirtualenv` auto-activates the venv. To re-enter later:
> `workon lnkto-venv`. The line above pulls in `python-dotenv`
> automatically.

## 4. Generate a SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copy the output. You'll paste it into `.env` in the next step.

## 5. Create your `.env` file

```bash
cd ~/LnkTo
cp .env.example .env
nano .env
```

Fill in:

```
SECRET_KEY=<paste-the-key-from-step-4>
DEBUG=0
FLASK_ENV=production
```

Save with `Ctrl+O`, `Enter`, then `Ctrl+X` to exit nano. (If you prefer
a graphical editor, edit the file from PythonAnywhere's **Files** tab —
it has a built-in browser editor.)

## 6. Initialise the database

```bash
cd ~/LnkTo
workon lnkto-venv
python create_db.py
ls -la ~/LnkTo_data     # should show shortener.db
```

## 7. Create the Web app

1. **Web** tab → **Add a new web app**.
2. Choose **Manual configuration** (the "Flask" quickstart creates a
   generic Hello-World app and won't use your code).
3. Pick **Python 3.12** (must match the venv).
4. After it creates the web app, you land on its config page.

## 8. Configure the Web app fields

On the Web tab, set:

| Section | Field | Value |
|---|---|---|
| **Code** | Source code | `/home/<yourusername>/LnkTo` |
| **Virtualenv** | Virtualenv | `/home/<yourusername>/.virtualenvs/lnkto-venv` |

You don't need to (and can't) change the WSGI file path. The WSGI
file's location is fixed by PythonAnywhere.

## 9. Verify the WSGI file imports your project

The link near the top of the Web tab labelled **"WSGI configuration
file: /var/www/...wsgi.py"** opens the fixed WSGI file in PA's web
editor. Check that its last line is:

```python
from wsgi import app as application
```

It should already be, because PythonAnywhere auto-generates this when
it sees your `requirements.txt`/`app.py`. If for some reason it
contains the old "Hello from Flask!" code instead, replace the entire
file contents with:

```python
import sys
project_home = '/home/<yourusername>/LnkTo'
if project_home not in sys.path:
    sys.path.insert(0, project_home)
from wsgi import app as application
```

## 10. Add a static-files mapping (recommended)

On the same **Web** tab → **Static files** section → **Add a new static files entry**:

| URL | Directory |
|---|---|
| `/static/` | `/home/<yourusername>/LnkTo/static/` |

## 11. Reload

Click the green **Reload** button at the top of the Web tab.

## 12. Visit your site

Open `https://<yourusername>.pythonanywhere.com` in a **hard-refreshed**
tab (Ctrl+F5 / Cmd+Shift+R) to bypass your browser cache. You should
see the LnkTo form. If you still see "Hello from Flask!", see
Troubleshooting below.

## 13. Updating later

```bash
cd ~/LnkTo
git pull
workon lnkto-venv && pip install -r requirements.txt
```

Then **Web** tab → **Reload**. Your `.env` and the SQLite file are
preserved.

## Troubleshooting

- **Still "Hello from Flask!"** — most common causes:
  1. **You didn't reload after editing the WSGI file.** Web tab →
     Reload, then hard-refresh.
  2. **The fixed `/var/www/...wsgi.py` is still the original Hello-World
     template** (it contains a literal `from flask import Flask; app =
     Flask(__name__); @app.route('/') def hello(): return "Hello from
     Flask!"` block). Open it via the link on the Web tab and replace
     its contents with the snippet in step 9.
  3. **Two web apps on the same hostname.** If you added a new web app
     but didn't delete the original default one, the *first* one (which
     may still be pointing at the old hello-world file) keeps serving
     traffic. Delete the unused web app from the Web tab.
  4. **Wrong username in `sys.path`.** Make sure the path in the WSGI
     file matches your actual username on PythonAnywhere.
- **500 Internal Server Error** — open the Web tab → Log files →
  `error.log`. Most common causes:
  - `.env` is missing or `SECRET_KEY` line is blank.
  - The venv path doesn't match `~/.virtualenvs/lnkto-venv`.
  - Missing dependency — re-run `pip install -r requirements.txt` inside
    the venv.
  - A Python error in your code — the full traceback is in `error.log`.
- **Routes 404 ("URL not found on the server")** — means `wsgi.py`
  ran but `url.views` wasn't imported. Verify with:
  ```bash
  cd ~/LnkTo && workon lnkto-venv && python -c "
  import wsgi
  for r in wsgi.application.url_map.iter_rules(): print(r)
  "
  ```
  You should see `/`, `/stats`, `/altcha-challenge.json`, etc.
- **Database errors** — verify `~/LnkTo_data/shortener.db` exists and
  that your `.env` (or default `$HOME/LnkTo_data`) matches.

## Troubleshooting checklist

- [ ] `~/LnkTo/.env` exists, has a real `SECRET_KEY`, `DEBUG=0`, `FLASK_ENV=production`
- [ ] Virtualenv path is `/home/<you>/.virtualenvs/lnkto-venv` on the Web tab
- [ ] Source code is `/home/<you>/LnkTo` on the Web tab
- [ ] `/var/www/<you>_pythonanywhere_com_wsgi.py` contains `from wsgi import app as application`
- [ ] You clicked **Reload** after every config change
- [ ] You hard-refreshed (Ctrl+F5) when reloading the browser
- [ ] Static files mapping points at `/home/<you>/LnkTo/static/`
- [ ] `~/LnkTo_data/shortener.db` exists (run `python create_db.py` if not)
- [ ] There's only one web app on the Web tab (or the right one is at the top)