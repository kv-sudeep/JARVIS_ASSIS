"""
tests/test_intruder.py — Unit tests for the Intruder Protocol.
All system-level actions (webcam, lock, email, SMS) are mocked.
"""
import sys
import types
import unittest
from unittest.mock import patch, MagicMock, mock_open
import tempfile
import os

# Stub out external libraries that may not be installed in CI
for mod in ("cv2", "twilio", "twilio.rest"):
    sys.modules.setdefault(mod, types.ModuleType(mod))

from security.intruder import (
    log_incident,
    lock_workstation,
    sleep_display,
)


class TestIncidentLogging(unittest.TestCase):

    def test_log_creates_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            log_path = os.path.join(tmpdir, "incidents.log")
            log_incident(log_path, snapshot_path="/fake/snap.jpg", details="test")
            self.assertTrue(os.path.exists(log_path))

    def test_log_contains_timestamp_and_details(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            log_path = os.path.join(tmpdir, "incidents.log")
            log_incident(log_path, snapshot_path=None, details="IP=192.168.1.1")
            content = open(log_path).read()
            self.assertIn("INTRUDER ALERT", content)
            self.assertIn("IP=192.168.1.1", content)

    def test_log_appends_multiple_entries(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            log_path = os.path.join(tmpdir, "incidents.log")
            log_incident(log_path, snapshot_path=None, details="first")
            log_incident(log_path, snapshot_path=None, details="second")
            content = open(log_path).read()
            self.assertEqual(content.count("INTRUDER ALERT"), 2)


class TestWorkstationLock(unittest.TestCase):

    @patch("security.intruder.subprocess.run")
    @patch("security.intruder.platform.system", return_value="Windows")
    def test_lock_calls_rundll32(self, _, mock_run):
        lock_workstation()
        args = mock_run.call_args[0][0]
        self.assertIn("rundll32.exe", args)
        self.assertIn("LockWorkStation", args[-1])

    @patch("security.intruder.subprocess.run")
    @patch("security.intruder.platform.system", return_value="Linux")
    def test_lock_skipped_on_non_windows(self, _, mock_run):
        lock_workstation()
        mock_run.assert_not_called()


class TestDisplaySleep(unittest.TestCase):

    @patch("security.intruder.subprocess.run")
    @patch("security.intruder.platform.system", return_value="Windows")
    def test_sleep_calls_powershell(self, _, mock_run):
        sleep_display()
        args = mock_run.call_args[0][0]
        self.assertIn("powershell", args)

    @patch("security.intruder.subprocess.run")
    @patch("security.intruder.platform.system", return_value="Darwin")
    def test_sleep_skipped_on_macos(self, _, mock_run):
        sleep_display()
        mock_run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
