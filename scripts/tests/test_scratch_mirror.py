#!/usr/bin/env python3
"""
Tests for scripts/local-wp/scratch-mirror.sh: the functions that give a scratch copy its own application password, register it
as a route site target and strip it back to a blank foundation. The script is sourced (it then runs nothing), with `wp` and `node` replaced by stubs that log their
arguments; no WSL, database or site is reached.
Run: python -m pytest scripts/tests/test_scratch_mirror.py
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = (Path(__file__).resolve().parents[1] / "local-wp" / "scratch-mirror.sh").as_posix()
# Git Bash, never the WSL launcher a PowerShell PATH finds first (it cannot open Windows paths): deploy_common.py::posix_bash.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "plugins" / "sgs-blocks" / "scripts"))
from deploy_common import posix_bash  # noqa: E402

BASH = posix_bash()
NAME = "local-mediatest-acme"
KEY_A = "LOCALMEDIATESTACME"
KEY_B = "LOCAL_MEDIATEST_ACME"

WP_STUB = """#!/bin/bash
echo "wp $*" >> "$STUB_LOG"
case "$*" in
  *"application-password list"*) printf 'uuid,name\nu-1,route-%s\nu-2,somebody-else\n' "$STUB_NAME" ;;
  *"application-password delete"*) ;;
  *"application-password create"*) [ -n "$STUB_APP" ] && printf '%s\n' "$STUB_APP" ;;
  *"config get DB_NAME"*) echo "${STUB_DB:-wp_mediatest_acme}" ;;
  *"option get sgs_active_header_cpt_id"*) echo 5 ;;
  *"option get"*) exit 1 ;;
  *"option list --search=sgs_business_*"*) printf 'sgs_business_name\nsgs_business_phone\n' ;;
  *"option list"*) ;;
  *"post list --post_type=sgs_header"*) echo "11 12" ;;
  *"post list --post_type=wp_global_styles"*) echo "40" ;;
  *"post list"*) ;;
  *"menu list"*) echo "7 8" ;;
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

    def strip_copy(self, name=NAME, marked=True, db=None):
        www = Path(self.tmp.name) / "www"
        (www / name).mkdir(parents=True, exist_ok=True)
        if marked:
            (www / name / ".scratch-source").write_text("local-mamas\n", encoding="utf-8")
        self.log.write_text("", encoding="utf-8")
        db_env = f"STUB_DB={db} " if db else ""
        snippet = f'sudo() {{ shift 2; "$@"; }}; {db_env}SCRATCH_WWW_ROOT="{www.as_posix()}" strip {name}'
        return self.bash(snippet), www / name

    def test_strip_removes_the_foundation_a_copy_holds_and_keeps_its_pages(self):
        r, d = self.strip_copy()
        self.assertEqual(r.returncode, 0, r.stderr)
        call = self.log.read_text(encoding="utf-8")
        self.assertIn("option delete sgs_active_header_cpt_id", call)
        self.assertNotIn("option delete sgs_active_footer_cpt_id", call, "an option that is not there is skipped, not deleted")
        self.assertIn("option delete sgs_business_name", call)
        self.assertIn("option delete sgs_business_phone", call)
        for pattern in ("sgs_business_*", "sgs_site_info*", "sgs_social_*"):
            self.assertIn(f"option list --search={pattern} --field=option_name", call)
        for t in ("sgs_header", "sgs_footer", "sgs_drawer", "wp_global_styles", "wp_template", "wp_template_part", "wp_navigation", "custom_css", "wp_font_family", "wp_font_face"):
            self.assertIn(f"post list --post_type={t} --post_status=any,trash,auto-draft --format=ids", call)
        self.assertIn("post delete 11 12 --force", call)
        self.assertIn("post delete 40 --force", call)
        self.assertIn("menu delete 7 8", call)
        self.assertIn("theme mod remove --all", call)
        for kept in ("page", "attachment", "product", "sgs_form", "sgs_modal"):
            self.assertNotIn(f"--post_type={kept} ", call)
        self.assertIn("stripped local-mediatest-acme: 2 sgs_header", r.stdout)
        self.assertIn("stripped local-mediatest-acme: 0 sgs_footer", r.stdout)
        self.assertIn("stripped local-mediatest-acme: 0 sgs_drawer", r.stdout)
        self.assertIn(f"--path={d.as_posix()}", call)

    def test_strip_refuses_a_folder_this_script_did_not_make_a_real_mirror_and_another_database(self):
        for kwargs, message in (({"marked": False}, "not a scratch copy"), ({"name": "local-mamas"}, "name must match"), ({"db": "wp_mediatest_other"}, "does not name its own database")):
            r, _ = self.strip_copy(**kwargs)
            self.assertNotEqual(r.returncode, 0, kwargs)
            self.assertIn(message, r.stderr)
            self.assertNotIn("delete", self.log.read_text(encoding="utf-8"), kwargs)
            self.assertNotIn("remove", self.log.read_text(encoding="utf-8"), kwargs)

    def reset_copy(self, name=NAME, marked=True, db=None):
        www = Path(self.tmp.name) / "www"
        (www / name).mkdir(parents=True, exist_ok=True)
        if marked:
            (www / name / ".scratch-source").write_text("local-mamas\n", encoding="utf-8")
        self.log.write_text("", encoding="utf-8")
        db_env = f"STUB_DB={db} " if db else ""
        snippet = f'sudo() {{ shift 2; "$@"; }}; {db_env}SCRATCH_WWW_ROOT="{www.as_posix()}" reset_shop_pages {name}'
        return self.bash(snippet), www / name

    def test_reset_shop_pages_runs_the_worker_on_the_copy_alone(self):
        r, d = self.reset_copy()
        self.assertEqual(r.returncode, 0, r.stderr)
        call = self.log.read_text(encoding="utf-8")
        self.assertRegex(call, rf"wp --path={d.as_posix()} --allow-root eval-file \S*scripts/local-wp/reset-shop-pages\.php {NAME}")
        self.assertTrue(Path(SCRIPT).with_name("reset-shop-pages.php").is_file())
        self.assertNotIn("delete", call, "the reset deletes no post, option, menu or mod of its own")

    def test_reset_shop_pages_refuses_a_folder_this_script_did_not_make_a_real_mirror_and_another_database(self):
        for kwargs, message in (({"marked": False}, "not a scratch copy"), ({"name": "local-mamas"}, "name must match"), ({"name": "local-eye-care"}, "name must match"), ({"db": "wp_mediatest_other"}, "refusing to reset its shop pages")):
            r, _ = self.reset_copy(**kwargs)
            self.assertNotEqual(r.returncode, 0, kwargs)
            self.assertIn(message, r.stderr)
            self.assertNotIn("eval-file", self.log.read_text(encoding="utf-8"), kwargs)

    def test_the_command_line_names_reset_shop_pages(self):
        src = Path(SCRIPT).read_text(encoding="utf-8")
        self.assertIn('reset-shop-pages) [ $# -eq 2 ] || die "usage: reset-shop-pages <local-mediatest-name>"; reset_shop_pages "$2" ;;', src)
        self.assertIn('guard_copy "$name" "$dir" "reset its shop pages"', src[src.index("reset_shop_pages() {"):src.index("list() {")])

    def test_create_makes_the_password_and_the_registration_in_that_order_and_drop_removes_the_registration(self):
        src = Path(SCRIPT).read_text(encoding="utf-8")
        create = src[src.index("create() {"):src.index("drop() {")]
        self.assertLess(create.index("write_secrets"), create.index("fresh_app_password"))
        self.assertLess(create.index("fresh_app_password"), create.index("scratch_target add"))
        self.assertIn('scratch_target remove "$name"', src[src.index("drop() {"):src.index("list() {")])
        self.assertIn("fresh_app_password \"$2\"", src[src.index("  secrets)\n"):src.index("  target)\n")])


PHP = shutil.which("php")
WORKER = (Path(__file__).resolve().parents[1] / "local-wp" / "reset-shop-pages.php").as_posix()
# WordPress, WP-CLI and WooCommerce's installer as far as the worker reaches them: pages by id, options, the metas it deletes.
PHP_STUBS = r"""<?php
define( 'ABSPATH', '/' );
class WP_CLI { static function error( $m ) { fwrite( STDERR, "ERROR $m\n" ); exit( 1 ); } static function log( $m ) { echo "$m\n"; } }
class WC_Install {
	protected static function get_cart_block_content() { return "<!-- wp:woocommerce/cart -->\n<div class=\"wp-block-woocommerce-cart\"></div>\n<!-- /wp:woocommerce/cart -->"; }
	protected static function get_checkout_block_content() { return "<!-- wp:woocommerce/checkout -->\n<div class=\"wp-block-woocommerce-checkout\"></div>\n<!-- /wp:woocommerce/checkout -->"; }
}
$GLOBALS['stub'] = json_decode( getenv( 'STUB_STATE' ), true );
function get_option( $o ) { return $GLOBALS['stub']['options'][ $o ] ?? false; }
function get_post( $id ) { return isset( $GLOBALS['stub']['pages'][ $id ] ) ? (object) array( 'ID' => $id, 'post_type' => $GLOBALS['stub']['pages'][ $id ] ) : null; }
function apply_filters( $hook, $value ) { return $value; }
function kses_remove_filters() { echo "KSES OFF\n"; }
function wp_slash( $v ) { return $v; }
function wp_update_post( $a, $err ) { $GLOBALS['saved'][ $a['ID'] ] = $a['post_content']; echo "SAVE {$a['ID']} " . json_encode( $a['post_content'] ) . "\n"; return $a['ID']; }
function is_wp_error( $x ) { return false; }
function delete_post_meta( $id, $key ) { echo "META $id $key\n"; }
function clean_post_cache( $id ) {}
function get_post_field( $f, $id, $c ) { return $GLOBALS['saved'][ $id ] ?? ''; }
$args = array( 'local-mediatest-acme' );
require getenv( 'WORKER' );
"""


@unittest.skipUnless(PHP, "php is needed")
class ResetShopPagesWorker(unittest.TestCase):
    def run_worker(self, options, pages):
        with tempfile.TemporaryDirectory() as tmp:
            runner = Path(tmp) / "run.php"
            runner.write_text(PHP_STUBS, encoding="utf-8")
            env = dict(os.environ, STUB_STATE=json.dumps({"options": options, "pages": pages}), WORKER=WORKER)
            return subprocess.run([PHP, runner.as_posix()], capture_output=True, text=True, env=env)

    def test_each_shop_page_gets_woocommerces_default_and_loses_the_site_builds_record(self):
        r = self.run_worker({"woocommerce_cart_page_id": "101", "woocommerce_checkout_page_id": "102", "woocommerce_myaccount_page_id": "103"}, {"101": "page", "102": "page", "103": "page"})
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("KSES OFF", r.stdout.splitlines()[0])
        self.assertIn(r'SAVE 101 "<!-- wp:woocommerce\/cart -->', r.stdout)
        self.assertIn(r'SAVE 102 "<!-- wp:woocommerce\/checkout -->', r.stdout)
        self.assertIn(r'SAVE 103 "<!-- wp:shortcode -->[woocommerce_my_account]<!-- \/wp:shortcode -->"', r.stdout)
        for page in ("101", "102", "103"):
            self.assertIn(f"META {page} _sgs_site_build_tree", r.stdout)
            self.assertIn(f"META {page} _sgs_site_build_content", r.stdout)
            self.assertIn(f"META {page} _sgs_checkout_content", r.stdout)
        self.assertIn("reset local-mediatest-acme: checkout page 102 holds WooCommerce's default content", r.stdout)

    def test_an_option_naming_no_page_stops_the_run(self):
        r = self.run_worker({"woocommerce_cart_page_id": "101", "woocommerce_checkout_page_id": "0", "woocommerce_myaccount_page_id": "103"}, {"101": "page", "103": "page"})
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("woocommerce_checkout_page_id names no page (0)", r.stderr)
        self.assertNotIn("SAVE 103", r.stdout, "nothing after the failing page is written")

    def test_a_post_that_is_not_a_page_is_refused(self):
        r = self.run_worker({"woocommerce_cart_page_id": "101", "woocommerce_checkout_page_id": "102", "woocommerce_myaccount_page_id": "103"}, {"101": "product", "102": "page", "103": "page"})
        self.assertNotEqual(r.returncode, 0)
        self.assertNotIn("SAVE", r.stdout)


if __name__ == "__main__":
    unittest.main()
