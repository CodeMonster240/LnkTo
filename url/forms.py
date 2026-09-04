from flask_wtf import FlaskForm
from wtforms import validators, StringField
from wtforms.validators import Length


class UrlForm(FlaskForm):
    old = StringField('Title', [
        validators.InputRequired(),
        validators.Length(
            min=4, max=2027, message="If URL\'s were that short, would you even be here?")
    ])
    # ALTCHA replaces Google reCAPTCHA. It is a free, open-source,
    # GDPR-compliant CAPTCHA that requires NO API key, account, or
    # external service. See https://altcha.org
    altcha = StringField('altcha', [
        validators.InputRequired(message="Please complete the anti-spam check.")
    ])

    def save_url(self, url):
        self.populate_obj(url)
        if not "http" in url.old:
            url.old = "https://" + url.old
        if not "." in url.old:
            url.old = url.old + ".com/"
        return url