import json
import string
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from random import choice
from flask import render_template, request, redirect, abort, send_from_directory, jsonify
from app import app, db
from url.forms import UrlForm
from url.models import Url
from settings import STATIC_DIR, SECRET_KEY

# ALTCHA: a free, open-source CAPTCHA that requires NO API key.
# It uses a server-issued proof-of-work challenge that the client solves.
# Docs: https://altcha.org/docs/v2/

ALTCHA_ALGORITHM = 'SHA-256'
ALTCHA_MAX_NUMBER = 1_000_000  # difficulty
ALTCHA_EXPIRY = 300           # seconds


def _make_challenge_payload():
    """Generate the challenge parameters sent to the ALTCHA widget."""
    salt = secrets.token_hex(12)
    challenge = (
        secrets.token_hex(32)
    )
    expires = datetime.now(timezone.utc) + timedelta(
        seconds=ALTCHA_EXPIRY)
    return {
        'algorithm': ALTCHA_ALGORITHM,
        'challenge': challenge,
        'salt': salt,
        'maxnumber': ALTCHA_MAX_NUMBER,
        'expires': expires.isoformat(),
        'signature': _sign_payload(challenge, salt, expires),
    }


def _sign_payload(challenge, salt, expires):
    """HMAC the challenge so users can't forge an easy one."""
    msg = f"{challenge}:{salt}:{expires.isoformat()}".encode()
    return hmac.new(SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()


def _verify_solution(payload):
    """Re-derive the expected PoW solution server-side."""
    try:
        algorithm = payload.get('algorithm', '').upper().replace('-', '')
        challenge = payload['challenge']
        salt = payload['salt']
        number = int(payload['number'])
        expires = datetime.fromisoformat(payload['expires'])
    except (KeyError, ValueError, TypeError):
        return False
    if expires < datetime.now(timezone.utc):
        return False
    if algorithm not in ('SHA256',):
        return False
    if number < 0 or number > ALTCHA_MAX_NUMBER:
        return False
    expected_sig = hmac.new(
        SECRET_KEY.encode(),
        f"{challenge}:{salt}:{expires.isoformat()}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not secrets.compare_digest(expected_sig, payload.get('signature', '')):
        return False
    # Hash input is "challenge.salt.number"
    data = f"{challenge}{salt}{number}".encode()
    h = hashlib.new(algorithm.lower(), data).hexdigest()
    # Valid: leading zero bytes count >= difficulty threshold
    zeros = 0
    for ch in h:
        if ch == '0':
            zeros += 1
        else:
            break
    # require at least 4 leading hex zeros (16 bits)
    return zeros >= 4


@app.route("/altcha-challenge.json")
def altcha_challenge():
    return jsonify(_make_challenge_payload())


@app.route("/", methods=['GET', 'POST'])
def index():

    if request.method == 'POST':
        def gen():
            chars = string.ascii_letters + string.digits
            length = 3
            code = ''.join(choice(chars) for x in range(length))
            print("Checking", code)
            exists = Url.query.filter_by(new=code).first()
            if exists is None:
                print("Your new code is:", code)
                return code
        code = gen()
        while code is None:
            code = gen()

    if request.method == 'POST' and code is not None:
        form = UrlForm(request.form)
        # Verify ALTCHA payload server-side (in addition to WTForms presence check)
        altcha_raw = request.form.get('altcha', '')
        altcha_ok = False
        if altcha_raw:
            try:
                altcha_ok = _verify_solution(json.loads(altcha_raw))
            except (ValueError, TypeError):
                altcha_ok = False
        if form.validate_on_submit() and altcha_ok:
            url = form.save_url(Url(new=code))
            db.session.add(url)
            db.session.commit()
            return render_template("success.html", code=code, old=url.old)
        else:
            print("Validation failed (form or ALTCHA)")
    else:
        form = UrlForm()
    return render_template("index.html", form=form)


@app.route('/<new>')
def redirect_to_old(new):
    new = Url.query.filter_by(new=new).first()
    if new is None:
        abort(404)
    else:
        new.hits = new.hits+1
        db.session.add(new)
        db.session.commit()
        return redirect(new.old)


@app.route("/stats")
@app.route("/stats/<int:page>")
def stats(page=1):
    stats = Url.query.order_by(Url.id.desc()).paginate(page=page, per_page=10, error_out=False)
    return render_template("stats.html", stats=stats)


@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404


@app.route('/favicon.ico')
def static_from_root():
    return send_from_directory(STATIC_DIR, request.path[1:])