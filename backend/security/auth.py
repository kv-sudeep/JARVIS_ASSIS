"""
auth.py — JARVIS Security Module
Handles PIN hashing (SHA-256 with hardware salt) and credential validation.
Manages failed-attempt tracking and lockout state.
"""
import hashlib
import json
import logging
import os
import threading
from pathlib import Path

from security.hardware import generate_hardware_fingerprint, get_hardware_components
from security import cloud_sync

logger = logging.getLogger(__name__)

CONFIG_PATH = Path(__file__).parent.parent / "config" / "security.json"

# Thread-safe failed attempt counter
_lock = threading.Lock()
_failed_attempts: int = 0
MAX_ATTEMPTS: int = 3


def _load_config() -> dict:
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


def _save_config(data: dict) -> None:
    with open(CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=2)


# ─── PIN Hashing ──────────────────────────────────────────────────────────────

def hash_pin(pin: str, hardware_fingerprint: str) -> str:
    """
    Hash a PIN using SHA-256 with the machine hardware fingerprint as salt.
    The salt is prepended to the PIN before hashing so it's machine-specific.
    """
    salted = f"{hardware_fingerprint}:{pin}"
    return hashlib.sha256(salted.encode("utf-8")).hexdigest()


# ─── Setup ────────────────────────────────────────────────────────────────────

def setup_credentials(pin: str) -> dict:
    """
    First-time setup: generate hardware fingerprint, hash the PIN, and save both
    to the local security config. Returns the stored fingerprint and hash.

    Also registers this machine with Lovable Cloud (fail-soft) so the owner
    can see authorized hardware in the web HUD.
    """
    fingerprint = generate_hardware_fingerprint()
    pin_hash    = hash_pin(pin, fingerprint)

    config = _load_config()
    config["hardware_fingerprint"] = fingerprint
    config["pin_hash"]             = pin_hash
    _save_config(config)

    # Cloud: register this machine + audit the setup event.
    try:
        cloud_sync.register_hardware(fingerprint, get_hardware_components())
        cloud_sync.log_audit(
            event_type="HARDWARE_REGISTERED",
            actor="system",
            description="Local Python backend registered hardware fingerprint.",
            severity="info",
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("Cloud registration failed (continuing locally): %s", exc)

    logger.info("Credentials setup complete. Fingerprint stored.")
    return {"fingerprint": fingerprint, "pin_hash": pin_hash}


def set_voice_sample_path(path: str) -> None:
    """Record the path to the reference voice sample in config."""
    config = _load_config()
    config["voice_sample_path"] = path
    config["setup_complete"]    = True
    _save_config(config)
    logger.info("Voice sample path saved: %s", path)


# ─── Fingerprint Verification ─────────────────────────────────────────────────

def verify_hardware_fingerprint() -> bool:
    """
    Compute the current machine's fingerprint and compare it against the stored
    one. If they differ, JARVIS refuses to start (copied to another PC).
    """
    config = _load_config()
    stored = config.get("hardware_fingerprint")
    if not stored:
        logger.error("No hardware fingerprint found in config. Run setup first.")
        return False

    current = generate_hardware_fingerprint()
    if current != stored:
        logger.critical(
            "Hardware fingerprint mismatch! Stored=%s Current=%s",
            stored[:16], current[:16]
        )
        return False

    logger.info("Hardware fingerprint verified OK.")
    return True


# ─── PIN Verification ─────────────────────────────────────────────────────────

def verify_pin(pin: str) -> bool:
    """
    Verify a submitted PIN against the stored hash.
    Increments the failed attempt counter on failure.
    Returns True on success, False on failure.
    Raises RuntimeError after MAX_ATTEMPTS failures.
    """
    global _failed_attempts

    config      = _load_config()
    stored_hash = config.get("pin_hash")
    fingerprint = config.get("hardware_fingerprint")

    if not stored_hash or not fingerprint:
        raise RuntimeError("JARVIS is not set up. Call /api/auth/setup first.")

    submitted_hash = hash_pin(pin, fingerprint)

    with _lock:
        if submitted_hash == stored_hash:
            _failed_attempts = 0
            logger.info("PIN verification successful.")
            cloud_sync.log_auth_attempt(
                attempt_type="pin",
                result="success",
                confidence=100,
                attempt_number=1,
                device_fingerprint=fingerprint[:32],
            )
            return True
        else:
            _failed_attempts += 1
            remaining = MAX_ATTEMPTS - _failed_attempts
            logger.warning(
                "PIN verification failed. Attempt %d/%d. Remaining: %d",
                _failed_attempts, MAX_ATTEMPTS, remaining
            )
            cloud_sync.log_auth_attempt(
                attempt_type="pin",
                result="fail",
                confidence=0,
                failure_reason="pin_mismatch",
                attempt_number=_failed_attempts,
                lockdown_triggered=_failed_attempts >= MAX_ATTEMPTS,
                threat_level="4" if _failed_attempts >= MAX_ATTEMPTS else "2",
                device_fingerprint=fingerprint[:32],
            )
            if _failed_attempts >= MAX_ATTEMPTS:
                cloud_sync.log_intruder_event(
                    trigger_type="repeated_pin_failure_local",
                    threat_level="4",
                    pin_attempts=_failed_attempts,
                    actions_taken=[{"type": "local_lockdown", "source": "python_backend"}],
                )
                raise RuntimeError(
                    f"LOCKDOWN: {MAX_ATTEMPTS} failed attempts. Intruder protocol activated."
                )
            return False


def get_failed_attempts() -> int:
    """Return current failed attempt count."""
    with _lock:
        return _failed_attempts


def reset_failed_attempts() -> None:
    """Reset the failed attempt counter (called after successful login)."""
    global _failed_attempts
    with _lock:
        _failed_attempts = 0


def is_setup_complete() -> bool:
    """Check if JARVIS has been fully configured."""
    config = _load_config()
    return bool(config.get("setup_complete", False))

def reset_setup() -> None:
    """Clear the setup configuration to allow registering a new identity."""
    _save_config({})
    logger.info("JARVIS credentials have been reset to factory defaults.")
