#!/usr/bin/env python3
"""
Tests for the `url_of` lookup in scripts/local-wp/push-to-remote.sh and refresh-from-remote.sh: a site's address comes from the
secrets file and key its calibration-targets entry names, never from its name. `acme-test` reads `live-acme.env` with key
`WP_URL_ACME`, as `mamas-test` reads `live-mamas.env`; a name with no entry reads `<name>.env`. Each script's function is cut out
of the script and run in bash against a temporary checkout (the script itself runs SSH and WSL, so it is not sourced); no real
secrets file is read.
Run: python -m pytest scripts/tests/test_remote_url_lookup.py
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
# Git Bash, never the WSL launcher a PowerShell PATH finds first (it cannot open Windows paths): deploy_common.py::posix_bash.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "plugins" / "sgs-blocks" / "scripts"))
from deploy_common import posix_bash  # noqa: E402

BASH = posix_bash()
SCRIPTS = ("push-to-remote.sh", "refresh-from-remote.sh")
TARGETS = {"acme-test": {"envFile": ".claude/secrets/live-acme.env", "envKey": "ACME"}}


def url_of_function(script: str) -> str:
    text = (REPO / "scripts" / "local-wp" / script).read_text(encoding="utf-8")
    match = re.search(r"^url_of\(\) \{\n.*?^\}\n", text, re.S | re.M)
    assert match, f"{script} has no url_of function"
    return match.group(0)


@unittest.skipUnless(BASH, "bash is needed")
class RemoteUrlLookup(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name)
        lib = self.repo / "plugins" / "sgs-blocks" / "scripts" / "lib"
        lib.mkdir(parents=True)
        shutil.copy(REPO / "plugins" / "sgs-blocks" / "scripts" / "lib" / "site_secrets.py", lib / "site_secrets.py")
        route = self.repo / "scripts" / "computed-route"
        route.mkdir(parents=True)
        (route / "calibration-targets.json").write_text(json.dumps(TARGETS), encoding="utf-8")
        self.secrets = self.repo / ".claude" / "secrets"
        self.secrets.mkdir(parents=True)
        (self.secrets / "live-acme.env").write_text("WP_URL_ACME='https://acme.example/'\r\nWP_USER_ACME=u\r\n", encoding="utf-8", newline="")
        (self.secrets / "plain-site.env").write_text("WP_URL_PLAINSITE=https://plain.example\n", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def url_of(self, script: str, name: str) -> str:
        snippet = f'REPO="{self.repo.as_posix()}"; SECRETS_DIR="$REPO/.claude/secrets"; {url_of_function(script)}\nurl_of "{name}"'
        out = subprocess.run([BASH, "-c", snippet], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        return out.stdout.strip()

    def test_a_target_whose_file_is_named_otherwise_is_found(self):
        """MUST FAIL on a lookup that opens <name>.env and reads WP_URL_<NAME>."""
        for script in SCRIPTS:
            with self.subTest(script=script):
                self.assertEqual(self.url_of(script, "acme-test"), "https://acme.example")

    def test_a_name_with_no_entry_reads_its_own_file(self):
        for script in SCRIPTS:
            with self.subTest(script=script):
                self.assertEqual(self.url_of(script, "plain-site"), "https://plain.example")

    def test_a_missing_file_gives_an_empty_address_for_the_caller_to_refuse(self):
        for script in SCRIPTS:
            with self.subTest(script=script):
                snippet = f'REPO="{self.repo.as_posix()}"; SECRETS_DIR="$REPO/.claude/secrets"; {url_of_function(script)}\nurl_of "nowhere" 2>/dev/null || true'
                out = subprocess.run([BASH, "-c", snippet], capture_output=True, text=True)
                self.assertEqual(out.stdout.strip(), "")


if __name__ == "__main__":
    unittest.main()
