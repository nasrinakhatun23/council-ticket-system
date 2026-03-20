import os
import smtplib
from pathlib import Path
from email.mime.text import MIMEText

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)


def send_email(to_email, subject, body):
    sender = os.getenv("SMTP_SENDER_EMAIL", "").strip()
    password = os.getenv("SMTP_APP_PASSWORD", "").strip()
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "465").strip())

    if not sender or not password:
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email

    with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
        server.login(sender, password)
        server.send_message(msg)