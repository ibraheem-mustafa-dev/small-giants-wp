#!/usr/bin/env python3
"""
provision-site-mail.py: give a client site working SMTP email through FluentSMTP.

Every email an SGS site sends (WooCommerce, forms, shop alerts, client notes) goes
through wp_mail(), and FluentSMTP routes wp_mail() over the client's own mailbox.
This script sets that up over SSH with WP-CLI, reusing build-deploy.py's TARGETS:

  1. installs and activates FluentSMTP (free, wordpress.org slug `fluent-smtp`);
  2. writes FLUENTMAIL_SMTP_USERNAME / FLUENTMAIL_SMTP_PASSWORD into wp-config.php
     with `wp config set` (the password travels over SSH stdin, never on a command
     line, never into the database, never printed);
  3. saves the SMTP connection through FluentSMTP's own Settings::store() with
     key_store `wp_config` (Smtp/Handler.php::setSettings then reads the two
     constants), so the option shape is always the installed plugin's own;
  4. turns email logging on and the daily sending digest on (FluentSMTP's email
     alert: sent and failed counts; instant alerts are Telegram/Slack/Discord only);
  5. runs --check, and with --test-to sends a test email and reads its log row.

The sender address and name default to the site's Site Info email and site title,
and the digest recipient defaults to the Site Info email. A test site holding a
real client's details (sandybrown) must override all three.

Usage:
  python plugins/sgs-blocks/scripts/provision-site-mail.py --target sandybrown \\
      --smtp-user ibraheem@smallgiantsstudio.co.uk --secret-key SMTP_PASS_SGS \\
      --from-email admin@smallgiantsstudio.co.uk --from-name "Small Giants Studio" \\
      --alert-email you@example.com --test-to you@example.com
  python plugins/sgs-blocks/scripts/provision-site-mail.py --target sandybrown --check

--check exits 1 when the site has no working FluentSMTP SMTP connection.
Secrets file: `--secret-file` (default .claude/secrets/ai-agent-credentials-and-info/
email.env); when a key is defined twice the last definition wins, as in dotenv.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import shlex
import smtplib
import ssl
import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS.parents[2]
DEFAULT_SECRET_FILE = REPO_ROOT / ".claude/secrets/ai-agent-credentials-and-info/email.env"
SMTP_HOST, SMTP_PORT, SMTP_ENCRYPTION = "smtp.hostinger.com", 465, "ssl"


def load_targets() -> dict:
    spec = importlib.util.spec_from_file_location("build_deploy", SCRIPTS / "build-deploy.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # guarded by `if __name__ == "__main__"`
    return module.TARGETS, module.SSH_FALLBACK, module.SSH_USER_HOST


def read_secret(path: Path, key: str) -> str:
    value = ""
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not value:
        sys.exit(f"ERROR: {key} not found in {path}")
    return value


class Site:
    def __init__(self, target: str, secret: str = ""):
        targets, ssh_fallback, user_host = load_targets()
        if target not in targets:
            sys.exit(f"ERROR: unknown target {target!r}; known: {', '.join(targets)}")
        root = targets[target]["wp_content"].rsplit("/wp-content", 1)[0]
        self.ssh = ["ssh", *ssh_fallback, "-o", "BatchMode=yes", user_host]
        self.cd = f"cd {shlex.quote(root)} && "
        self.secret = secret

    def redact(self, text: str) -> str:
        return text.replace(self.secret, "***") if self.secret else text

    def run(self, command: str, stdin: str = "") -> subprocess.CompletedProcess:
        # Bytes, not text mode: text mode on Windows writes "\n" as "\r\n", and the
        # remote `read -r` then keeps the "\r" as the password's last character.
        result = subprocess.run(
            [*self.ssh, self.cd + command], input=stdin.encode("utf-8"),
            capture_output=True, timeout=180,
        )
        result.stdout = self.redact(result.stdout.decode("utf-8", "replace"))
        result.stderr = self.redact(result.stderr.decode("utf-8", "replace"))
        return result

    def php(self, code: str, *args: str) -> dict:
        """Run PHP through `wp eval-file -`; the code echoes one JSON object."""
        quoted = " ".join(shlex.quote(a) for a in args)
        result = self.run(f"wp eval-file - {quoted}", stdin="<?php\n" + code)
        try:
            return json.loads(result.stdout.strip().splitlines()[-1])
        except (IndexError, json.JSONDecodeError):
            sys.exit(f"ERROR: remote PHP failed\n{result.stdout}\n{result.stderr}")


CONFIGURE_PHP = r"""
list( $from_email, $from_name, $alert_email, $host, $port, $encryption ) = $args;
$info        = (array) get_option( 'sgs_site_info', array() );
$site_email  = is_email( $info['email'] ?? '' ) ? $info['email'] : get_option( 'admin_email' );
$from_email  = is_email( $from_email ) ? $from_email : $site_email;
$from_name   = '' !== $from_name ? $from_name : wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
$alert_email = is_email( $alert_email ) ? $alert_email : $site_email;
$model       = new \FluentMail\App\Models\Settings();
$model->store( array(
	'connection_key' => md5( $from_email ),
	'valid_senders'  => array(),
	'connection'     => array(
		'provider' => 'smtp', 'sender_name' => $from_name, 'sender_email' => $from_email,
		'force_from_name' => 'yes', 'force_from_email' => 'yes', 'return_path' => 'yes',
		'host' => $host, 'port' => (string) $port, 'auth' => 'yes', 'username' => '',
		'password' => '', 'auto_tls' => 'yes', 'encryption' => $encryption, 'key_store' => 'wp_config',
	),
) );
$misc = $model->getMisc();
$misc['default_connection'] = md5( $from_email );
$misc['log_emails']         = 'yes';
$model->updateMiscSettings( $misc );
$notify = $model->notificationSettings();
$notify['enabled']      = 'yes';
$notify['notify_email'] = $alert_email;
$notify['notify_days']  = array( 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' );
update_option( '_fluent_smtp_notify_settings', $notify, false );
echo wp_json_encode( array( 'from_email' => $from_email, 'from_name' => $from_name, 'alert_email' => $alert_email ) );
"""

CHECK_PHP = r"""
$s   = (array) get_option( 'fluentmail-settings', array() );
$key = $s['misc']['default_connection'] ?? '';
$c   = $s['connections'][ $key ]['provider_settings'] ?? array();
$n   = (array) get_option( '_fluent_smtp_notify_settings', array() );
echo wp_json_encode( array(
	'plugin_active'       => defined( 'FLUENTMAIL' ),
	'constants_defined'   => defined( 'FLUENTMAIL_SMTP_USERNAME' ) && defined( 'FLUENTMAIL_SMTP_PASSWORD' ) && '' !== FLUENTMAIL_SMTP_PASSWORD,
	'provider'            => $c['provider'] ?? '',
	'key_store'           => $c['key_store'] ?? '',
	'password_in_db'      => ! empty( $c['password'] ),
	'host'                => ( $c['host'] ?? '' ) . ':' . ( $c['port'] ?? '' ) . '/' . ( $c['encryption'] ?? '' ),
	'sender'              => ( $c['sender_name'] ?? '' ) . ' <' . ( $c['sender_email'] ?? '' ) . '>',
	'log_emails'          => $s['misc']['log_emails'] ?? '',
	'digest'              => ( $n['enabled'] ?? 'no' ) . ' -> ' . ( $n['notify_email'] ?? '' ),
) );
"""

TEST_PHP = r"""
list( $to ) = $args;
$subject = 'SGS mail test from ' . wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) . ' ' . gmdate( 'Y-m-d H:i:s' );
$sent    = wp_mail( $to, $subject, "This test email proves the site sends through its SMTP mailbox.\n\n" . home_url( '/' ) );
global $wpdb;
$table = $wpdb->prefix . FLUENT_MAIL_DB_PREFIX . 'email_logs';
$row   = $wpdb->get_row( $wpdb->prepare( "SELECT id, status, `from`, subject FROM {$table} WHERE subject = %s ORDER BY id DESC LIMIT 1", $subject ), ARRAY_A );
echo wp_json_encode( array( 'wp_mail' => $sent, 'subject' => $subject, 'log' => $row ) );
"""


def check(site: Site) -> int:
    state = site.php(CHECK_PHP)
    for key, value in state.items():
        print(f"  {key:18} {value}")
    healthy = (
        state["plugin_active"] and state["constants_defined"] and state["provider"] == "smtp"
        and state["key_store"] == "wp_config" and not state["password_in_db"]
        and state["log_emails"] == "yes"
    )
    print("CHECK:", "PASS" if healthy else "FAIL (no working FluentSMTP SMTP connection)")
    return 0 if healthy else 1


def provision(site: Site, args: argparse.Namespace, password: str) -> None:
    print(f"1/4 SMTP login as {args.smtp_user} at {SMTP_HOST}:{SMTP_PORT} (from this machine)")
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context(), timeout=30) as smtp:
        smtp.login(args.smtp_user, password)

    print("2/4 FluentSMTP install and activate")
    result = site.run("(wp plugin is-installed fluent-smtp || wp plugin install fluent-smtp) && wp plugin activate fluent-smtp")
    if result.returncode:
        sys.exit(f"ERROR: plugin install failed\n{result.stdout}\n{result.stderr}")

    print("3/4 wp-config constants (password over stdin)")
    user = shlex.quote(args.smtp_user)
    result = site.run(
        f"wp config set FLUENTMAIL_SMTP_USERNAME {user} --type=constant --quiet"
        ' && IFS= read -r P && wp config set FLUENTMAIL_SMTP_PASSWORD "$P" --type=constant --quiet',
        stdin=password + "\n",
    )
    if result.returncode:
        sys.exit(f"ERROR: wp config set failed\n{result.stdout}\n{result.stderr}")

    print("4/4 FluentSMTP connection, logging and digest")
    saved = site.php(CONFIGURE_PHP, args.from_email, args.from_name, args.alert_email,
                     SMTP_HOST, str(SMTP_PORT), SMTP_ENCRYPTION)
    print(f"  sender {saved['from_name']} <{saved['from_email']}>, digest to {saved['alert_email']}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--target", required=True, help="a build-deploy.py TARGETS key")
    parser.add_argument("--check", action="store_true", help="report the state only; exit 1 when unconfigured")
    parser.add_argument("--smtp-user", help="mailbox login (an alias cannot sign in)")
    parser.add_argument("--secret-file", type=Path, default=DEFAULT_SECRET_FILE)
    parser.add_argument("--secret-key", help="the key holding the mailbox password")
    parser.add_argument("--from-email", default="", help="default: the Site Info email")
    parser.add_argument("--from-name", default="", help="default: the site title")
    parser.add_argument("--alert-email", default="", help="daily digest recipient; default: the Site Info email")
    parser.add_argument("--test-to", default="", help="send a test email to this address after setup")
    args = parser.parse_args()

    if args.check:
        return check(Site(args.target))
    if not (args.smtp_user and args.secret_key):
        parser.error("provisioning needs --smtp-user and --secret-key (or use --check)")

    password = read_secret(args.secret_file, args.secret_key)
    site = Site(args.target, secret=password)
    provision(site, args, password)
    status = check(site)
    if status == 0 and args.test_to:
        sent = site.php(TEST_PHP, args.test_to)
        print(f"TEST: wp_mail={sent['wp_mail']} log={sent['log']}")
        if not sent["wp_mail"] or not sent["log"] or sent["log"]["status"] != "sent":
            return 1
    return status


if __name__ == "__main__":
    sys.exit(main())
