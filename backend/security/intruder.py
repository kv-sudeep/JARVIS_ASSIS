"""
intruder.py — JARVIS Security Module
Intruder Protocol: triggered after 3 failed authentication attempts.

Actions (in order):
  1. Capture webcam snapshot of intruder.
  2. Log incident with timestamp.
  3. Send WhatsApp/SMS alert via Twilio.
  4. Send email alert via SMTP.
  5. Lock the workstation immediately.
  6. Put the display to sleep.
"""
import datetime
import logging
import os
import platform
import smtplib
import subprocess
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

logger = logging.getLogger(__name__)


# ─── Webcam Snapshot ──────────────────────────────────────────────────────────

def capture_intruder_snapshot(snapshots_dir: str) -> str | None:
    """
    Capture a single frame from the default webcam.
    Saves it as a JPEG with timestamp. Returns path or None on failure.
    """
    try:
        import cv2  # type: ignore
        os.makedirs(snapshots_dir, exist_ok=True)

        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.error("Cannot open webcam for intruder snapshot.")
            return None

        # Allow camera to warm up
        for _ in range(5):
            cap.read()

        ret, frame = cap.read()
        cap.release()

        if not ret:
            logger.error("Failed to capture frame from webcam.")
            return None

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename  = f"intruder_{timestamp}.jpg"
        filepath  = os.path.join(snapshots_dir, filename)
        cv2.imwrite(filepath, frame)
        logger.warning("Intruder snapshot captured: %s", filepath)
        return filepath

    except Exception as e:
        logger.error("Webcam snapshot error: %s", e)
        return None


# ─── Incident Logging ─────────────────────────────────────────────────────────

def log_incident(log_path: str, snapshot_path: str | None, details: str = "") -> None:
    """Append a timestamped incident record to the incident log file."""
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    timestamp = datetime.datetime.now().isoformat()
    entry = (
        f"[{timestamp}] INTRUDER ALERT\n"
        f"  Details  : {details or 'Unknown'}\n"
        f"  Snapshot : {snapshot_path or 'No snapshot'}\n"
        f"{'─' * 60}\n"
    )
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(entry)
    logger.warning("Incident logged at %s", log_path)


# ─── Twilio Alert ─────────────────────────────────────────────────────────────

def send_twilio_alert(snapshot_path: str | None) -> None:
    """Send a WhatsApp/SMS alert via Twilio when an intruder is detected."""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token  = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_number = os.getenv("TWILIO_FROM", "")
    to_number   = os.getenv("TWILIO_TO", "")

    if not all([account_sid, auth_token, from_number, to_number]):
        logger.warning("Twilio credentials not configured — skipping SMS alert.")
        return

    try:
        from twilio.rest import Client  # type: ignore
        client = Client(account_sid, auth_token)

        body = (
            f"🚨 JARVIS INTRUDER ALERT 🚨\n"
            f"Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"3 failed login attempts detected.\n"
            f"Workstation has been LOCKED.\n"
            f"Snapshot: {'Captured' if snapshot_path else 'Not available'}"
        )

        msg = client.messages.create(
            body=body,
            from_=from_number,
            to=to_number,
        )
        logger.warning("Twilio alert sent. SID: %s", msg.sid)
    except Exception as e:
        logger.error("Twilio alert failed: %s", e)


# ─── Email Alert ──────────────────────────────────────────────────────────────

def send_email_alert(snapshot_path: str | None) -> None:
    """Send an SMTP email alert when an intruder is detected."""
    smtp_host   = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port   = int(os.getenv("SMTP_PORT", "587"))
    smtp_user   = os.getenv("SMTP_USER", "")
    smtp_pass   = os.getenv("SMTP_PASS", "")
    alert_email = os.getenv("ALERT_EMAIL", "")

    if not all([smtp_user, smtp_pass, alert_email]):
        logger.warning("SMTP credentials not configured — skipping email alert.")
        return

    try:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "🚨 JARVIS SECURITY ALERT — Intruder Detected"
        msg["From"]    = smtp_user
        msg["To"]      = alert_email

        html = f"""
        <html><body style="font-family:monospace;background:#0a0f1e;color:#00f0ff;padding:24px;">
          <h2 style="color:#ff4444;">⚠️ JARVIS INTRUDER ALERT</h2>
          <p><strong>Time:</strong> {timestamp}</p>
          <p><strong>Event:</strong> 3 consecutive failed login attempts</p>
          <p><strong>Action:</strong> Workstation locked. Display put to sleep.</p>
          <p><strong>Snapshot:</strong> {'Captured — check snapshots directory' if snapshot_path else 'Webcam not available'}</p>
          <hr style="border-color:#00f0ff33;"/>
          <p style="color:#888;font-size:11px;">JARVIS Security System — Stark Industries</p>
        </body></html>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, alert_email, msg.as_string())

        logger.warning("Email alert sent to %s", alert_email)
    except Exception as e:
        logger.error("Email alert failed: %s", e)


# ─── System Lockdown ──────────────────────────────────────────────────────────

def lock_workstation() -> None:
    """Lock the Windows workstation immediately."""
    if platform.system() != "Windows":
        logger.warning("Workstation lock only supported on Windows.")
        return
    try:
        subprocess.run(
            ["rundll32.exe", "user32.dll,LockWorkStation"],
            check=True,
        )
        logger.warning("Workstation LOCKED.")
    except Exception as e:
        logger.error("Workstation lock failed: %s", e)


def sleep_display() -> None:
    """Put the display to sleep on Windows via PowerShell."""
    if platform.system() != "Windows":
        return
    try:
        # SendMessage to the desktop window with WM_SYSCOMMAND SC_MONITORPOWER 2
        ps_cmd = (
            r"Add-Type -TypeDefinition '"
            r"using System;using System.Runtime.InteropServices;"
            r"public class Display {"
            r"[DllImport(\"user32.dll\")]public static extern IntPtr SendMessage(IntPtr hWnd,int Msg,IntPtr wParam,IntPtr lParam);"
            r"}' -Language CSharp;"
            r"[Display]::SendMessage(-1, 0x0112, new IntPtr(0xF170), new IntPtr(2));"
        )
        subprocess.run(
            ["powershell", "-Command", ps_cmd],
            check=True,
        )
        logger.warning("Display SLEEPING.")
    except Exception as e:
        logger.error("Display sleep failed: %s", e)


# ─── Master Protocol ──────────────────────────────────────────────────────────

def activate_intruder_protocol(snapshots_dir: str, log_path: str, details: str = "") -> None:
    """
    Run all intruder protocol steps in sequence.
    Called from a background thread to avoid blocking the HTTP response.
    """
    logger.critical("=== INTRUDER PROTOCOL ACTIVATED ===")

    # 1. Capture snapshot
    snapshot_path = capture_intruder_snapshot(snapshots_dir)

    # 2. Log the incident
    log_incident(log_path, snapshot_path, details)

    # 3. Send alerts concurrently
    twilio_thread = threading.Thread(target=send_twilio_alert, args=(snapshot_path,), daemon=True)
    email_thread  = threading.Thread(target=send_email_alert,  args=(snapshot_path,), daemon=True)
    twilio_thread.start()
    email_thread.start()

    # 4. Lock workstation (small delay to let alerts dispatch)
    import time
    time.sleep(1.5)
    lock_workstation()

    # 5. Sleep display
    sleep_display()

    twilio_thread.join(timeout=10)
    email_thread.join(timeout=10)
    logger.critical("=== INTRUDER PROTOCOL COMPLETE ===")
