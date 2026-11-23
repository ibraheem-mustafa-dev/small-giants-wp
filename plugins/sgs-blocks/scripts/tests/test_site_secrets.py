#!/usr/bin/env python3
"""
Tests for lib/site_secrets.py and the Python readers of a site's logins: a site's secrets file and key come from its
calibration-targets entry, never from its name. `acme-test` reads `.claude/secrets/live-acme.env` with keys `WP_*_ACME` (as
`mamas-test` reads `live-mamas.env`), so a reader that builds `<site>.env` or `WP_URL_<SITE>` from the name finds nothing. A
temporary checkout holds the fake secrets; no real secrets file is read and no value is printed.
Run: python -m pytest plugins/sgs-blocks/scripts/tests/test_site_secrets.py
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS / "lib"))
import site_secrets  # noqa: E402

TARGETS = {
    "acme-test": {"envFile": ".claude/secrets/live-acme.env", "envKey": "ACME"},
    "local-acme": {"envFile": ".claude/secrets/local-acme.env", "envKey": "LOCALACME", "mirrorOf": "acme-test"},
}
ENV = 'WP_URL_ACME=https://acme.example/\nWP_USER_ACME=Claude\nWP_APP_PWD_ACME=abcd efgh\n'


def load_drift():
    spec = importlib.util.spec_from_file_location("check_motion_stagger_drift", SCRIPTS / "check-motion-stagger-drift.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SiteSecrets(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name)
        route = self.repo / "scripts" / "computed-route"
        route.mkdir(parents=True)
        (route / "calibration-targets.json").write_text(json.dumps(TARGETS), encoding="utf-8")
        secrets = self.repo / ".claude" / "secrets"
        secrets.mkdir(parents=True)
        (secrets / "live-acme.env").write_text(ENV, encoding="utf-8")
        self.saved = os.environ.pop("SGS_SECRETS_ROOT", None)
        os.environ["SGS_SECRETS_ROOT"] = str(self.repo)

    def tearDown(self):
        os.environ.pop("SGS_SECRETS_ROOT", None)
        if self.saved is not None:
            os.environ["SGS_SECRETS_ROOT"] = self.saved
        self.tmp.cleanup()

    def test_secrets_of_reads_the_entry_and_falls_back_to_the_convention(self):
        self.assertEqual(site_secrets.secrets_of("acme-test", TARGETS), (".claude/secrets/live-acme.env", "ACME"))
        self.assertEqual(site_secrets.secrets_of("local-mediatest-x", TARGETS), (".claude/secrets/local-mediatest-x.env", "LOCALMEDIATESTX"))
        self.assertEqual(site_secrets.secrets_of("half", {"half": {"envFile": ".claude/secrets/half.env"}}), site_secrets.conventional_secrets("half"))

    def test_read_targets_merges_the_local_file_and_refuses_a_replacement(self):
        route = self.repo / "scripts" / "computed-route"
        self.assertEqual(site_secrets.read_targets(self.repo), TARGETS)
        (route / "calibration-targets.local.json").write_text(json.dumps({"local-mediatest-x": {"envFile": ".claude/secrets/x.env", "envKey": "X"}}), encoding="utf-8")
        self.assertEqual(site_secrets.secrets_of("local-mediatest-x", site_secrets.read_targets(self.repo)), (".claude/secrets/x.env", "X"))
        (route / "calibration-targets.local.json").write_text(json.dumps({"acme-test": {}}), encoding="utf-8")
        with self.assertRaises(ValueError):
            site_secrets.read_targets(self.repo)

    def test_secrets_file_is_placed_under_the_secrets_root(self):
        path = site_secrets.secrets_file(".claude/secrets/live-acme.env", self.repo)
        self.assertEqual(path.name, "live-acme.env")
        self.assertTrue(path.is_file())

    def test_the_command_line_prints_the_file_and_key_never_a_value(self):
        lib = self.repo / "plugins" / "sgs-blocks" / "scripts" / "lib"
        lib.mkdir(parents=True)
        copy = lib / "site_secrets.py"
        copy.write_text((SCRIPTS / "lib" / "site_secrets.py").read_text(encoding="utf-8"), encoding="utf-8")
        out = subprocess.run([sys.executable, str(copy), "acme-test"], capture_output=True)
        self.assertEqual(out.returncode, 0)
        self.assertEqual(out.stdout, b".claude/secrets/live-acme.env\tACME\n")

    def test_stagger_drift_reads_the_entry_s_file_and_key(self):
        """MUST FAIL on a reader that opens <site>.env and reads WP_*_<SITE>."""
        drift = load_drift()
        url, user, password = drift.site_credentials("acme-test", self.repo, TARGETS)
        self.assertEqual((url, user, password), ("https://acme.example", "Claude", "abcd efgh"))
        with self.assertRaises(SystemExit) as lacks:
            drift.site_credentials("acme-test", self.repo, {"acme-test": {"envFile": ".claude/secrets/live-acme.env", "envKey": "OTHER"}})
        self.assertIn("lacks WP_USER_OTHER", str(lacks.exception))
        with self.assertRaises(SystemExit) as missing:
            drift.site_credentials("nowhere", self.repo, TARGETS)
        self.assertIn("nowhere.env", str(missing.exception))


if __name__ == "__main__":
    unittest.main()
