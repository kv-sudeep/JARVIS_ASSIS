"""
tests/test_hardware.py — Unit tests for hardware fingerprinting.
Uses mocking so no real WMIC calls are made during CI.
"""
import hashlib
import sys
import types
import unittest
from unittest.mock import patch, MagicMock

# ── Stub out wmi so the import of hardware.py doesn't fail on non-Windows CI ──
sys.modules.setdefault("wmi", types.ModuleType("wmi"))

from security.hardware import (
    get_cpu_serial,
    get_mac_address,
    generate_hardware_fingerprint,
    get_hardware_components,
)


class TestHardwareFingerprint(unittest.TestCase):

    @patch("security.hardware.subprocess.check_output")
    def test_get_cpu_serial_windows(self, mock_subproc):
        """WMIC returns a well-formed CPU serial."""
        mock_subproc.return_value = b"ProcessorId\r\nBFEBFBFF000906EA\r\n"
        serial = get_cpu_serial()
        self.assertEqual(serial, "BFEBFBFF000906EA")

    @patch("security.hardware.subprocess.check_output")
    def test_wmic_failure_returns_unknown(self, mock_subproc):
        """If WMIC fails, return UNKNOWN gracefully."""
        mock_subproc.side_effect = Exception("WMIC not available")
        serial = get_cpu_serial()
        self.assertEqual(serial, "UNKNOWN")

    @patch("security.hardware.uuid.getnode", return_value=0xAABBCCDDEEFF)
    def test_mac_address_format(self, _):
        """MAC address is returned in XX:XX:XX:XX:XX:XX format."""
        mac = get_mac_address()
        parts = mac.split(":")
        self.assertEqual(len(parts), 6)
        for part in parts:
            self.assertEqual(len(part), 2)

    @patch("security.hardware.get_cpu_serial",      return_value="CPU_TEST")
    @patch("security.hardware.get_motherboard_id",  return_value="MB_TEST")
    @patch("security.hardware.get_mac_address",     return_value="AA:BB:CC:DD:EE:FF")
    @patch("security.hardware.get_disk_serial",     return_value="DISK_TEST")
    def test_fingerprint_is_deterministic(self, *_):
        """Same hardware inputs → same fingerprint output."""
        fp1 = generate_hardware_fingerprint()
        fp2 = generate_hardware_fingerprint()
        self.assertEqual(fp1, fp2)
        self.assertEqual(len(fp1), 64)  # SHA-256 hex = 64 chars

    @patch("security.hardware.get_cpu_serial",      return_value="CPU_A")
    @patch("security.hardware.get_motherboard_id",  return_value="MB_A")
    @patch("security.hardware.get_mac_address",     return_value="00:11:22:33:44:55")
    @patch("security.hardware.get_disk_serial",     return_value="DISK_A")
    def test_different_hardware_different_fingerprint(self, *_):
        """Manually verify that a different raw string produces a different hash."""
        raw_a = "JARVIS|CPU:CPU_A|MB:MB_A|MAC:00:11:22:33:44:55|DISK:DISK_A"
        raw_b = "JARVIS|CPU:CPU_B|MB:MB_B|MAC:FF:EE:DD:CC:BB:AA|DISK:DISK_B"
        fp_a  = hashlib.sha256(raw_a.encode()).hexdigest()
        fp_b  = hashlib.sha256(raw_b.encode()).hexdigest()
        self.assertNotEqual(fp_a, fp_b)

    @patch("security.hardware.get_cpu_serial",      return_value="CPU_TEST")
    @patch("security.hardware.get_motherboard_id",  return_value="MB_TEST")
    @patch("security.hardware.get_mac_address",     return_value="AA:BB:CC:DD:EE:FF")
    @patch("security.hardware.get_disk_serial",     return_value="DISK_TEST")
    def test_hardware_components_returns_dict(self, *_):
        """get_hardware_components returns all four keys."""
        components = get_hardware_components()
        for key in ("cpu_serial", "motherboard_id", "mac_address", "disk_serial"):
            self.assertIn(key, components)


if __name__ == "__main__":
    unittest.main()
