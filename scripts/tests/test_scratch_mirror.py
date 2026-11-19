#!/usr/bin/env python3
"""
Tests for scripts/local-wp/scratch-mirror.sh: the functions that give a scratch copy its own application password and register it
as a route site target. The script is sourced (it then runs nothing), with `wp` and `node` replaced by stubs that log their
arguments; no WSL, database or site is reached.
Run: python -m pytest scripts/tests/test_scratch_mirror.py
"""
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = (Path(__file__).resolve().parents[1] / "local-wp" / "scratch-mirror.sh").as_posix()
BASH = shutil.which("bash")
NAME = "local-mediatest-acme"
KEY_A = "LOCALMEDIATESTACME"
KEY_B = "LOCAL_MEDIATEST_ACME"

WP_STUB = """#!/bin/bash
echo "wp $*" >> "$STUB_LOG"
case "$*" in
  *"application-password list"*) printf 'uuid,name\nu-1,route-%s\nu-2,somebody-else\n' "$STUB_NAME" ;;
  *"application-password delete"*) ;;
  *"application-password create"*) [ -n "$STUB_APP" ] && printf '%s\n' "$STUB_APP" ;;
esac
"""
NODE_STUB = """#!/bin/bash
echo "node $*" >> "$STUB_LOG"
exit "${STUB_NODE_EXIT:-0}"
"""


@unittest.skipUnless(BASH, "bash is needed")
class ScratchMirror(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.bin = root / "bin"
        self.bin.mkdir()
        for name, body in (("wp", WP_STUB), ("node", NODE_STUB)):
            (self.bin / name).write_text(body, encoding="utf-8", newline="\n")
        self.secrets = root / "secrets"
        self.secrets.mkdir()
        self.log = root / "stub.log"
        self.log.write_text("", encoding="utf-8")
        self.env_file = self.secrets / f"{NAME}.env"

    def tearDown(self):
        self.tmp.cleanup()

    def bash(self, snippet, app="abcd efgh ijkl mnop", node_exit="0"):
        env = dict(os.environ, PATH=f"{self.bin.as_posix()}:{os.environ['PATH']}", STUB_LOG=self.log.as_posix(), STUB_NAME=NAME, STUB_APP=app, STUB_NODE_EXIT=node_exit)
        script = f'source "{SCRIPT}"; secrets_dir() {{ echo "{self.secrets.as_posix()}"; }}; {snippet}'
        return subprocess.run([BASH, "-c", script], capture_output=True, text=True, env=env)

    def write_env(self, lines):
        self.env_file.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

    def env_lines(self):
        return self.env_file.read_text(encoding="utf-8").splitlines()

    def test_a_copy_gets_its_own_password_under_both_key_spellings_and_keeps_every_other_line(self):
        self.write_env([f"WP_URL_{KEY_A}=http://localhost:8123", f"WP_USER_{KEY_A}=Claude", f"WP_APP_PWD_{KEY_A}=stale one", f"WP_APP_PWD_{KEY_B}=stale two", f"WP_PWD_{KEY_A}=login"])
        r = self.bash(f"fresh_app_password {NAME}")
        self.assertEqual(r.returncode, 0, r.stderr)
        lines = self.env_lines()
        self.assertIn(f'WP_APP_PWD_{KEY_A}="abcd efgh ijkl mnop"', lines)
        self.assertIn(f'WP_APP_PWD_{KEY_B}="abcd efgh ijkl mnop"', lines)
        self.assertNotIn(f"WP_APP_PWD_{KEY_A}=stale one", lines)
        self.assertNotIn(f"WP_APP_PWD_{KEY_B}=stale two", lines)
        self.assertEqual([x for x in lines if "APP_PWD" not in x], [f"WP_URL_{KEY_A}=http://localhost:8123", f"WP_USER_{KEY_A}=Claude", f"WP_PWD_{KEY_A}=login"])

    def test_the_password_is_never_printed(self):
        self.write_env([f"WP_USER_{KEY_A}=Claude"])
        r = self.bash(f"fresh_app_password {NAME}")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertNotIn("abcd", r.stdout + r.stderr)

    def test_an_earlier_password_the_script_made_is_revoked_and_nobody_elses_is(self):
        self.write_env([f"WP_USER_{KEY_A}=Claude"])
        self.bash(f"fresh_app_password {NAME}")
        calls = self.log.read_text(encoding="utf-8")
        self.assertIn("application-password delete Claude u-1", calls)
        self.assertNotIn("u-2", calls)
        self.assertIn(f"application-password create Claude route-{NAME} --porcelain", calls)

    def test_a_login_file_with_no_user_fails_and_is_left_as_it_was(self):
        self.write_env([f"WP_URL_{KEY_A}=http://localhost:8123"])
        r = self.bash(f"fresh_app_password {NAME}")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn(f"has no WP_USER_{KEY_A}", r.stderr)
        self.assertEqual(self.env_lines(), [f"WP_URL_{KEY_A}=http://localhost:8123"])
        self.assertNotIn("create", self.log.read_text(encoding="utf-8"), "no password is made for no user")

    def test_a_user_with_quotes_and_a_carriage_return_is_read_clean(self):
        self.env_file.write_bytes(f'WP_USER_{KEY_A}="Claude"\r\n'.encode())
        r = self.bash(f"fresh_app_password {NAME}")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("application-password create Claude route-", self.log.read_text(encoding="utf-8"))

    def test_when_wordpress_makes_no_password_the_file_is_left_as_it_was(self):
        self.write_env([f"WP_USER_{KEY_A}=Claude", f"WP_APP_PWD_{KEY_A}=kept"])
        r = self.bash(f"fresh_app_password {NAME}", app="")
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(self.env_lines(), [f"WP_USER_{KEY_A}=Claude", f"WP_APP_PWD_{KEY_A}=kept"])

    def test_creating_a_copy_registers_it_through_the_scratch_target_tool(self):
        r = self.bash(f"scratch_target add {NAME} local-acme http://localhost:8123")
        self.assertEqual(r.returncode, 0, r.stderr)
        call = self.log.read_text(encoding="utf-8")
        self.assertRegex(call, rf"node .*scripts/computed-route/tools/scratch-target\.mjs add {NAME} --source local-acme --url http://localhost:8123")

    def test_dropping_a_copy_removes_its_registration(self):
        r = self.bash(f"scratch_target remove {NAME}")
        self.assertEqual(r.returncode, 0, r.stderr)
        call = self.log.read_text(encoding="utf-8")
        self.assertRegex(call, rf"scratch-target\.mjs remove {NAME}\s*$")
        self.assertNotIn("--source", call)

    def test_a_registration_the_tool_refuses_fails_the_function(self):
        r = self.bash(f"scratch_target add {NAME} local-acme http://localhost:8123", node_exit="2")
        self.assertEqual(r.returncode, 2)

    def test_the_script_runs_nothing_when_sourced(self):
        r = self.bash("echo sourced")
        self.assertEqual(r.stdout.strip(), "sourced")
        self.assertEqual(self.log.read_text(encoding="utf-8"), "")

    def test_create_makes_the_password_and_the_registration_in_that_order_and_drop_removes_the_registration(self):
        src = Path(SCRIPT).read_text(encoding="utf-8")
        create = src[src.index("create() {"):src.index("drop() {")]
        self.assertLess(create.index("write_secrets"), create.index("fresh_app_password"))
        self.assertLess(create.index("fresh_app_password"), create.index("scratch_target add"))
        self.assertIn('scratch_target remove "$name"', src[src.index("drop() {"):src.index("list() {")])
        self.assertIn("fresh_app_password \"$2\"", src[src.index("  secrets)\n"):src.index("  target)\n")])


if __name__ == "__main__":
    unittest.main()
