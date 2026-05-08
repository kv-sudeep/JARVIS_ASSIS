"""
cloud_sync.py — Mirror local JARVIS security events into Lovable Cloud.

Every helper here is fail-soft: errors are logged but never raised. The local
Flask backend must keep functioning even if the cloud is unreachable.

Tables touched (all defined in the Lovable Cloud Supabase schema):
  - auth_attempts          (immutable, append-only)
  - audit_log              (immutable, append-only)
  - intruder_events        (insert + later resolve)
  - sessions               (insert on JWT issue, update on logout)
  - hardware_fingerprints  (upsert — register the local machine)
  - owners                 (counters: total_logins_count, last_login_at, ...)
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import json
import logging
import platform
import socket
from typing import Any, Optional

from .supabase_client import get_client, get_owner_id

logger = logging.getLogger(__name__)


def _now() -> str:
    return _dt.datetime.utcnow().replace(tzinfo=_dt.timezone.utc).isoformat()


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _safe_insert(table: str, row: dict) -> None:
    sb = get_client()
    if sb is None:
        return
    try:
        sb.table(table).insert(row).execute()
    except Exception as exc:  # pragma: no cover
        logger.warning("Cloud insert into %s failed: %s", table, exc)


def _safe_update(table: str, row: dict, *, eq: tuple[str, Any]) -> None:
    sb = get_client()
    if sb is None:
        return
    try:
        sb.table(table).update(row).eq(eq[0], eq[1]).execute()
    except Exception as exc:  # pragma: no cover
        logger.warning("Cloud update on %s failed: %s", table, exc)


# ── Auth attempts ────────────────────────────────────────────────────────────
def log_auth_attempt(
    *,
    attempt_type: str,                 # 'pin' | 'voice' | 'face' | 'totp' | ...
    result: str,                       # 'success' | 'fail' | 'partial' | 'blocked'
    confidence: Optional[int] = None,
    failure_reason: Optional[str] = None,
    attempt_number: int = 1,
    lockdown_triggered: bool = False,
    threat_level: Optional[str] = None,
    device_fingerprint: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    _safe_insert(
        "auth_attempts",
        {
            "attempt_type": attempt_type,
            "result": result,
            "confidence_score": confidence,
            "failure_reason": failure_reason,
            "attempt_number_in_sequence": attempt_number,
            "lockdown_triggered": lockdown_triggered,
            "threat_level": threat_level,
            "device_fingerprint": device_fingerprint,
            "ip_address": ip_address,
            "browser_agent": f"jarvis-py/{platform.python_version()} {platform.system()}",
        },
    )


# ── Audit log ────────────────────────────────────────────────────────────────
def log_audit(
    *,
    event_type: str,
    actor: str = "jarvis",            # 'owner' | 'jarvis' | 'intruder' | 'system'
    description: str,
    severity: str = "info",           # 'info' | 'warning' | 'critical'
    affected_resource: Optional[str] = None,
    before_state: Optional[dict] = None,
    after_state: Optional[dict] = None,
) -> None:
    _safe_insert(
        "audit_log",
        {
            "event_type": event_type,
            "actor": actor,
            "action_description": description,
            "severity": severity,
            "affected_resource": affected_resource,
            "before_state": before_state,
            "after_state": after_state,
        },
    )


# ── Intruder events ──────────────────────────────────────────────────────────
def log_intruder_event(
    *,
    trigger_type: str,
    threat_level: str = "4",
    pin_attempts: int = 0,
    actions_taken: Optional[list] = None,
    ip_address: Optional[str] = None,
    webcam_snapshot_path: Optional[str] = None,
    microphone_audio_path: Optional[str] = None,
) -> None:
    _safe_insert(
        "intruder_events",
        {
            "trigger_type": trigger_type,
            "threat_level": threat_level,
            "pin_attempts": pin_attempts,
            "actions_taken": actions_taken or [],
            "ip_address": ip_address,
            "webcam_snapshot_path": webcam_snapshot_path,
            "microphone_audio_path": microphone_audio_path,
        },
    )


# ── Sessions ─────────────────────────────────────────────────────────────────
def open_session(
    *,
    login_method: str = "pin",
    auth_score: int = 0,
    ttl_hours: int = 4,
    ip_address: Optional[str] = None,
    jwt_token: Optional[str] = None,
    device_fingerprint: Optional[str] = None,
) -> Optional[str]:
    """Insert a sessions row tied to the configured owner. Returns session_id."""
    owner_id = get_owner_id()
    if owner_id is None:
        return None

    sb = get_client()
    if sb is None:
        return None

    expires_at = (
        _dt.datetime.utcnow() + _dt.timedelta(hours=ttl_hours)
    ).replace(tzinfo=_dt.timezone.utc).isoformat()

    payload = {
        "owner_id": owner_id,
        "login_method": login_method,
        "auth_score": auth_score,
        "expires_at": expires_at,
        "ip_address": ip_address,
        "jwt_token_hash": _hash(jwt_token) if jwt_token else None,
        "browser_fingerprint": device_fingerprint,
        "os_name": platform.system(),
        "os_version": platform.release(),
        "device_name": socket.gethostname(),
        "device_type": "desktop",
    }
    try:
        res = sb.table("sessions").insert(payload).execute()
        if res.data:
            return res.data[0].get("session_id")
    except Exception as exc:  # pragma: no cover
        logger.warning("Cloud open_session failed: %s", exc)
    return None


def close_session(session_id: str, *, reason: str = "logout") -> None:
    if not session_id:
        return
    _safe_update(
        "sessions",
        {
            "is_active": False,
            "terminated_at": _now(),
            "termination_reason": reason,
        },
        eq=("session_id", session_id),
    )


# ── Hardware fingerprint registry ────────────────────────────────────────────
def register_hardware(machine_hash: str, components: dict) -> None:
    """Upsert this machine's fingerprint so the owner can see it in the UI."""
    sb = get_client()
    if sb is None:
        return
    row = {
        "machine_hash": machine_hash,
        "cpu_id_hash": _hash(components.get("cpu_serial", "")),
        "motherboard_id_hash": _hash(components.get("motherboard_id", "")),
        "mac_address_hash": _hash(components.get("mac_address", "")),
        "disk_serial_hash": _hash(components.get("disk_serial", "")),
        "hostname_hash": _hash(socket.gethostname()),
        "label": socket.gethostname(),
        "last_seen_at": _now(),
    }
    try:
        # Upsert on machine_hash so we don't duplicate.
        sb.table("hardware_fingerprints").upsert(row, on_conflict="machine_hash").execute()
    except Exception as exc:  # pragma: no cover
        logger.warning("Cloud register_hardware failed: %s", exc)


# ── Owner counters ───────────────────────────────────────────────────────────
def bump_owner_login() -> None:
    """Increment login counters on the owners row after a successful login."""
    owner_id = get_owner_id()
    sb = get_client()
    if sb is None or owner_id is None:
        return
    try:
        cur = sb.table("owners").select(
            "total_logins_count, failed_attempt_count"
        ).eq("owner_id", owner_id).single().execute()
        total = (cur.data or {}).get("total_logins_count", 0) + 1
        sb.table("owners").update({
            "total_logins_count": total,
            "failed_attempt_count": 0,
            "last_login_at": _now(),
        }).eq("owner_id", owner_id).execute()
    except Exception as exc:  # pragma: no cover
        logger.warning("Cloud bump_owner_login failed: %s", exc)


def is_account_locked() -> bool:
    """Read account_status from the cloud — single source of truth."""
    owner_id = get_owner_id()
    sb = get_client()
    if sb is None or owner_id is None:
        return False
    try:
        res = sb.table("owners").select(
            "account_status"
        ).eq("owner_id", owner_id).single().execute()
        return (res.data or {}).get("account_status") == "lockdown"
    except Exception as exc:  # pragma: no cover
        logger.warning("Cloud is_account_locked failed: %s", exc)
        return False


def serialize_for_log(obj: Any) -> str:
    """Helper for callers that want to stuff structured data into a log line."""
    try:
        return json.dumps(obj, default=str)
    except Exception:
        return str(obj)
