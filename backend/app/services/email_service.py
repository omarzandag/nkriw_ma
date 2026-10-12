"""Email service: SMTP sending with OTP and branded HTML templates.

SMTP configuration comes from the site_settings table (admin-configurable)
with .env bootstrap defaults. Emails are sent synchronously via smtplib in a
thread executor so the FastAPI event loop is never blocked.
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.services.settings_service import get_smtp_config

# Single worker thread: SMTP sends are rare (password resets, test emails)
_executor = ThreadPoolExecutor(max_workers=1)

BRAND_GREEN = "#16A34A"
BRAND_ORANGE = "#F97316"


class EmailError(Exception):
    """Raised when an email cannot be sent."""


def _smtp_send(cfg: dict, to_email: str, subject: str, html_body: str, text_body: str) -> None:
    """Send one email over SMTP. Runs in a worker thread."""
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = formataddr((cfg["from_name"], cfg["from_email"]))
    message["To"] = to_email
    message.attach(MIMEText(text_body, "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))

    host, port = cfg["host"], cfg["port"]
    if cfg["use_ssl"]:
        # Implicit SSL (port 465)
        context = ssl.create_default_context()
        server = smtplib.SMTP_SSL(host, port, timeout=20, context=context)
    else:
        server = smtplib.SMTP(host, port, timeout=20)
        # STARTTLS (port 587)
        if cfg["use_tls"]:
            server.starttls(context=ssl.create_default_context())

    try:
        if cfg["user"]:
            server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_email"], [to_email], message.as_string())
    finally:
        try:
            server.quit()
        except Exception:
            pass


def send_email(db: Session, to_email: str, subject: str, html_body: str, text_body: str = "") -> None:
    """Send an email using the admin-configured SMTP settings.

    Raises EmailError with a human-readable message on failure — callers
    decide how to surface it (forgot-password stays silent, admin test
    email shows the error).
    """
    cfg = get_smtp_config(db)
    if not cfg["enabled"] or not cfg["host"] or not cfg["user"]:
        raise EmailError("SMTP is not configured. An administrator must configure email settings first.")

    future = _executor.submit(_smtp_send, cfg, to_email, subject, html_body, text_body)
    try:
        future.result(timeout=30)
    except smtplib.SMTPAuthenticationError:
        raise EmailError("SMTP authentication failed — check the username and password.")
    except smtplib.SMTPException as e:
        raise EmailError(f"SMTP error: {e}")
    except Exception as e:
        raise EmailError(f"Failed to send email: {e}")


# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------

def _email_shell(title: str, body_html: str, footer_note: str) -> str:
    """Wrap body content in the NKRIW.MA branded email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title></head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:{BRAND_GREEN};padding:24px 32px;text-align:center;">
            <span style="color:#FFFFFF;font-size:26px;font-weight:700;letter-spacing:0.5px;">NKRIW.MA</span>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          {body_html}
        </td></tr>
        <tr>
          <td style="background-color:#F9FAFB;padding:16px 32px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:12px;color:#6B7280;text-align:center;">{footer_note}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def build_password_reset_email(user_name: str, otp_code: str) -> tuple[str, str, str]:
    """Build the password reset OTP email.

    Returns (subject, html_body, text_body).
    """
    subject = "NKRIW.MA — Your Password Reset Code"
    html = _email_shell(
        title=subject,
        body_html=f"""
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Reset Your Password</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            Hello {user_name},<br><br>
            We received a request to reset your NKRIW.MA password. Enter the code below to continue:
          </p>
          <div style="text-align:center;margin:28px 0;">
            <div style="display:inline-block;background-color:#F0FDF4;border:2px dashed {BRAND_GREEN};border-radius:10px;padding:18px 40px;">
              <span style="font-size:34px;font-weight:700;letter-spacing:8px;color:{BRAND_GREEN};">{otp_code}</span>
            </div>
          </div>
          <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">
            This code expires in <strong>10 minutes</strong>. If you did not request a password reset,
            you can safely ignore this email — your password will not change.
          </p>
          <p style="margin:16px 0 0;font-size:13px;color:#6B7280;line-height:1.6;">
            For your security, never share this code with anyone. NKRIW.MA staff will never ask you for it.
          </p>
        """,
        footer_note="NKRIW.MA — Morocco's community platform for housing, co-location & carpooling.",
    )
    text = (
        f"Hello {user_name},\n\n"
        f"We received a request to reset your NKRIW.MA password.\n\n"
        f"Your reset code: {otp_code}\n\n"
        f"This code expires in 10 minutes. If you did not request this, ignore this email.\n\n"
        f"— The NKRIW.MA Team"
    )
    return subject, html, text


def build_test_email(admin_email: str) -> tuple[str, str, str]:
    """Build a test email the admin can send to verify SMTP settings."""
    subject = "NKRIW.MA — SMTP Test Email"
    sent_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    html = _email_shell(
        title=subject,
        body_html=f"""
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">SMTP Configuration Works 🎉</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            This is a test email from your NKRIW.MA admin dashboard, sent to <strong>{admin_email}</strong>
            at {sent_at}.
          </p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
            Your SMTP settings are correctly configured — platform emails (password resets,
            booking notifications, etc.) will now be delivered successfully.
          </p>
        """,
        footer_note="NKRIW.MA — Morocco's community platform for housing, co-location & carpooling.",
    )
    text = (
        f"SMTP Configuration Works!\n\n"
        f"This is a test email from your NKRIW.MA admin dashboard, sent to {admin_email} at {sent_at}.\n\n"
        f"— The NKRIW.MA Team"
    )
    return subject, html, text


def send_password_reset_otp(db: Session, to_email: str, user_name: str, otp_code: str) -> None:
    """Send the password reset OTP email."""
    subject, html, text = build_password_reset_email(user_name, otp_code)
    send_email(db, to_email, subject, html, text)


def send_test_email(db: Session, to_email: str) -> None:
    """Send a test email to verify SMTP settings."""
    subject, html, text = build_test_email(to_email)
    send_email(db, to_email, subject, html, text)
