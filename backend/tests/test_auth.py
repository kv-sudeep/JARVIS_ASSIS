"""
tests/test_auth.py — Unit tests for PIN hashing and credential verification.
"""
import hashlib
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch, mock_open, MagicMock

# Stub out wmi
sys.modules.setdefault("wmi", types.ModuleType("wmi"))

import security.auth as auth_module
from security.auth import hash_pin, MAX_ATTEMPTS


class TestPinHashing(unittest.TestCase):

    def test_hash_pin_deterministic(self):
        """Same PIN + same fingerprint → same hash every time."""
        fp   = "mock_fingerprint_abc123"
        pin  = "4321"
        h1   = hash_pin(pin, fp)
        h2   = hash_pin(pin, fp)
        self.assertEqual(h1, h2)

    def test_hash_pin_is_sha256(self):
        """Result is a 64-char hex string (SHA-256)."""
        h = hash_pin("1234", "fingerprint")
        self.assertEqual(len(h), 64)
        int(h, 16)  # Should not raise

    def test_different_pin_different_hash(self):
        """Different PINs produce different hashes."""
        fp = "same_fingerprint"
        self.assertNotEqual(hash_pin("1111", fp), hash_pin("9999", fp))

    def test_different_fingerprint_different_hash(self):
        """Same PIN on a different machine → different hash (salt effect)."""
        pin = "5678"
        self.assertNotEqual(
            hash_pin(pin, "machine_A_fingerprint"),
            hash_pin(pin, "machine_B_fingerprint"),
        )


FAKE_CONFIG_GOOD = {
    "hardware_fingerprint": "mock_fp",
    "pin_hash": hash_pin("1234", "mock_fp"),
    "voice_sample_path": "/fake/path.npy",
    "setup_complete": True,
}

FAKE_CONFIG_EMPTY = {
    "hardware_fingerprint": None,
    "pin_hash": None,
    "voice_sample_path": None,
    "setup_complete": False,
}


class TestPinVerification(unittest.TestCase):

    def setUp(self):
        """Reset failed attempts before each test."""
        auth_module._failed_attempts = 0

    def _mock_config(self, cfg):
        return patch("security.auth._load_config", return_value=cfg)

    def test_correct_pin_returns_true(self):
        with self._mock_config(FAKE_CONFIG_GOOD):
            result = auth_module.verify_pin("1234")
        self.assertTrue(result)

    def test_wrong_pin_returns_false(self):
        with self._mock_config(FAKE_CONFIG_GOOD):
            result = auth_module.verify_pin("0000")
        self.assertFalse(result)

    def test_failed_attempts_increment(self):
        with self._mock_config(FAKE_CONFIG_GOOD):
            auth_module.verify_pin("wrong1")
            auth_module.verify_pin("wrong2")
        self.assertEqual(auth_module.get_failed_attempts(), 2)

    def test_lockdown_after_max_attempts(self):
        with self._mock_config(FAKE_CONFIG_GOOD):
            for _ in range(MAX_ATTEMPTS - 1):
                auth_module.verify_pin("bad")
            with self.assertRaises(RuntimeError) as ctx:
                auth_module.verify_pin("bad")
        self.assertIn("LOCKDOWN", str(ctx.exception))

    def test_no_config_raises_runtime_error(self):
        with self._mock_config(FAKE_CONFIG_EMPTY):
            with self.assertRaises(RuntimeError):
                auth_module.verify_pin("1234")

    def test_reset_failed_attempts(self):
        auth_module._failed_attempts = 2
        auth_module.reset_failed_attempts()
        self.assertEqual(auth_module.get_failed_attempts(), 0)


class TestHardwareVerification(unittest.TestCase):

    def test_fingerprint_mismatch_returns_false(self):
        cfg = {**FAKE_CONFIG_GOOD, "hardware_fingerprint": "stored_fingerprint"}
        with patch("security.auth._load_config", return_value=cfg), \
             patch("security.auth.generate_hardware_fingerprint", return_value="different_fp"):
            result = auth_module.verify_hardware_fingerprint()
        self.assertFalse(result)

    def test_fingerprint_match_returns_true(self):
        cfg = {**FAKE_CONFIG_GOOD, "hardware_fingerprint": "matching_fp"}
        with patch("security.auth._load_config", return_value=cfg), \
             patch("security.auth.generate_hardware_fingerprint", return_value="matching_fp"):
            result = auth_module.verify_hardware_fingerprint()
        self.assertTrue(result)

    def test_no_stored_fingerprint_returns_false(self):
        cfg = {**FAKE_CONFIG_EMPTY}
        with patch("security.auth._load_config", return_value=cfg):
            result = auth_module.verify_hardware_fingerprint()
        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
