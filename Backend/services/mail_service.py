import os
import logging
from flask_mail import Mail, Message

logger = logging.getLogger(__name__)

mail = None


def init_mail(app):
    """Initialize Flask-Mail with the Flask app"""
    global mail
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.getenv('EMAIL_ADDRESS')
    app.config['MAIL_PASSWORD'] = os.getenv('EMAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('EMAIL_ADDRESS')
    mail = Mail(app)


def send_welcome_email(to_email: str, name: str, role: str):
    """
    Send a welcome email after successful signup.
    If sending fails, only log the error — do not raise.
    """
    if mail is None:
        logger.warning("Mail not initialized. Skipping welcome email.")
        return

    subject = "Welcome to Codexa"
    body = f"""Hello {name},

Your Codexa account has been created successfully.

Role: {role.capitalize()}

You can now login and use the platform.

Regards,
Codexa Team"""

    try:
        msg = Message(subject=subject, recipients=[to_email], body=body)
        mail.send(msg)
        logger.info(f"Welcome email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {e}")


def send_login_notification_email(to_email: str, name: str):
    """
    Send a login notification email after successful login.
    If sending fails, only log the error — do not raise.
    """
    if mail is None:
        logger.warning("Mail not initialized. Skipping login notification email.")
        return

    from datetime import datetime
    current_time = datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")

    subject = "New Login Detected"
    body = f"""Hello {name},

A successful login was detected on your Codexa account.

Time: {current_time}

If this wasn't you, contact the administrator.

Regards,
Codexa Team"""

    try:
        msg = Message(subject=subject, recipients=[to_email], body=body)
        mail.send(msg)
        logger.info(f"Login notification email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send login notification email to {to_email}: {e}")


def send_preference_notification(user, preference_key: str, subject: str, body: str):
    """Send an event email only when the account enabled both event and email preferences."""
    if mail is None or not os.getenv('EMAIL_ADDRESS') or not os.getenv('EMAIL_PASSWORD'):
        logger.info("Email notifications are unavailable; skipping %s", preference_key)
        return

    preferences = user.get('settings', {}).get('notifications', {})
    if not preferences.get('email_notifications') or not preferences.get(preference_key):
        return

    try:
        msg = Message(subject=subject, recipients=[user['email']], body=body)
        mail.send(msg)
        logger.info("Preference notification sent for %s to %s", preference_key, user['email'])
    except Exception as e:
        logger.error("Failed to send %s notification to %s: %s", preference_key, user.get('email'), e)


def send_support_message(user, category: str, message: str, support_email: str):
    if mail is None or not support_email:
        return False
    try:
        msg = Message(
            subject=f"Codexa {category} from {user['email']}",
            recipients=[support_email],
            body=f"From: {user['email']}\nRole: {user.get('role')}\n\n{message}",
        )
        mail.send(msg)
        return True
    except Exception as e:
        logger.error("Failed to send Codexa support message from %s: %s", user.get('email'), e)
        return False
