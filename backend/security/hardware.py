"""
hardware.py — JARVIS Security Module
Generates a unique hardware fingerprint for this specific machine.
Combines CPU ID, Motherboard ID, MAC Address, and Disk Serial.
"""
import hashlib
import uuid
import subprocess
import platform
import logging

logger = logging.getLogger(__name__)


def _wmic_query(wmic_class: str, field: str) -> str:
    """Run a WMIC command and return the first non-empty value found."""
    try:
        result = subprocess.check_output(
            ["wmic", wmic_class, "get", field],
            stderr=subprocess.DEVNULL,
            timeout=10,
        ).decode("utf-8", errors="ignore")
        lines = [line.strip() for line in result.splitlines() if line.strip()]
        # First line is the header (field name), second line is the value
        if len(lines) >= 2:
            return lines[1]
    except Exception as e:
        logger.warning("WMIC query failed for %s.%s: %s", wmic_class, field, e)
    return "UNKNOWN"


def get_cpu_serial() -> str:
    """Read the CPU Processor ID via WMIC."""
    if platform.system() == "Windows":
        return _wmic_query("cpu", "ProcessorId")
    return "UNKNOWN"


def get_motherboard_id() -> str:
    """Read the motherboard serial number via WMIC."""
    if platform.system() == "Windows":
        return _wmic_query("baseboard", "SerialNumber")
    return "UNKNOWN"


def get_mac_address() -> str:
    """Get the primary MAC address."""
    try:
        mac = uuid.UUID(int=uuid.getnode()).hex[-12:]
        return ":".join(mac[i:i+2] for i in range(0, 12, 2)).upper()
    except Exception as e:
        logger.warning("MAC address read failed: %s", e)
        return "UNKNOWN"


def get_disk_serial() -> str:
    """Read the primary disk drive serial number via WMIC."""
    if platform.system() == "Windows":
        return _wmic_query("diskdrive", "SerialNumber")
    return "UNKNOWN"


def generate_hardware_fingerprint() -> str:
    """
    Combine all hardware identifiers into a single SHA-256 fingerprint.
    This fingerprint is machine-specific and used as a salt for PIN hashing.
    """
    cpu  = get_cpu_serial()
    mb   = get_motherboard_id()
    mac  = get_mac_address()
    disk = get_disk_serial()

    raw = f"JARVIS|CPU:{cpu}|MB:{mb}|MAC:{mac}|DISK:{disk}"
    logger.info("Hardware raw string (partial): CPU=%s MAC=%s", cpu[:8], mac)

    fingerprint = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return fingerprint


def get_hardware_components() -> dict:
    """Return all individual hardware components for diagnostics."""
    return {
        "cpu_serial":      get_cpu_serial(),
        "motherboard_id":  get_motherboard_id(),
        "mac_address":     get_mac_address(),
        "disk_serial":     get_disk_serial(),
    }
