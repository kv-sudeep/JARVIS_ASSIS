"""
supabase_client.py — JARVIS Lovable Cloud bridge.

Provides a singleton service-role Supabase client so the Python backend can
mirror local auth events into the shared cloud database used by the Lovable
web HUD.

Behavior is designed to be fail-soft: if cloud sync is disabled or the
service-role key is missing, helpers return None and callers continue to
operate purely on the local machine. JARVIS must always work offline.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_client = None
_disabled_logged = False


def _is_enabled() -> bool:
    """Cloud sync is enabled only when explicitly turned on AND keys exist."""
    if os.getenv("JARVIS_CLOUD_SYNC", "true").lower() not in {"1", "true", "yes", "on"}:
        return False
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


def get_client():
    """Return a cached service-role Supabase client, or None if disabled."""
    global _client, _disabled_logged

    if _client is not None:
        return _client

    if not _is_enabled():
        if not _disabled_logged:
            logger.info(
                "Cloud sync disabled (set JARVIS_CLOUD_SYNC=true and "
                "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY to enable)."
            )
            _disabled_logged = True
        return None

    try:
        from supabase import create_client  # type: ignore
    except ImportError:
        logger.warning(
            "supabase-py not installed. Run `pip install -r requirements.txt` "
            "to enable cloud sync."
        )
        return None

    try:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
        logger.info("Lovable Cloud client initialized (service-role).")
        return _client
    except Exception as exc:  # pragma: no cover
        logger.error("Failed to initialize Supabase client: %s", exc)
        return None


def get_owner_id() -> Optional[str]:
    """Return the configured owner UUID, if set."""
    val = os.getenv("SUPABASE_OWNER_ID")
    return val if val else None
