#!/usr/bin/env python3
"""
provision-site-info-from-draft.py: fill a client site's Site Info from the clone pipeline's handover report.

Site Info is the site's stored business details (WordPress option `sgs_site_info`, class
SGS\\Blocks\\Sgs_Site_Info). The clone pipeline (scripts/computed-route/fill.mjs) writes a
`handover.json` per surface; entries with owner `site-info` name a Site Info key and the
address the draft shows (a social link, a tel: link, a mailto: link). This script proposes
those addresses as the site's Site Info values and, with --apply, writes them.

Handover entries read (extra fields are tolerated):
  { owner: "site-info", kind: "link", key: "socials.instagram", address: "https://...", ref: "..." }
  and the pipeline's evidence shape:
  { owner: "site-info", node: "...", evidence: { key: "...", draft: "https://...", ref: "..." } }
The file is a JSON list, or an object holding the list under `handover` or `entries`.

Rules (the dry run prints every decision):
  - a key that is already non-empty on the site is NEVER overwritten;
  - a placeholder address is skipped with its reason (example.com/.org/.net hosts, path
    segments such as yourpage or username, "#", empty, a bare social host, a scheme other
    than http(s) for a social link, tel: for a phone, mailto: for an email);
  - two entries for one key with different addresses are both skipped (conflicting addresses).

Usage:
  python plugins/sgs-blocks/scripts/provision-site-info-from-draft.py --site eye-care-test \\
      --handover sites/eye-care-ward-end/build/qa/header/handover.json            # dry run
  python plugins/sgs-blocks/scripts/provision-site-info-from-draft.py --site eye-care-test \\
      --handover <path> [--handover <path> ...] --apply

--apply first backs the whole option up to .claude/backups/<today>/<site>/sgs_site_info.json
(md5 printed), writes each proposed key through Sgs_Site_Info::set() under `wp --user=Claude`
(values travel base64-encoded on stdin-fed PHP's argument list, never interpolated into PHP),
then reads the option back and fails loudly when a read-back differs.
"""
from __future__ import annotations

import argparse
import base64
import datetime
import hashlib
import importlib.util
import json
import re
import shlex
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

SCRIPTS = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS.parents[2]
DEFAULT_BACKUP_ROOT = REPO_ROOT / ".claude" / "backups"
WP_USER = "Claude"

# Mirrors Sgs_Site_Info_Binding::EDITOR_KEYS (the contact and social keys a draft can show).
ALLOWED_KEYS = (
    "phone", "email", "address",
    "socials.whatsapp", "socials.facebook", "socials.instagram", "socials.twitter",
    "socials.linkedin", "socials.youtube", "socials.tiktok", "socials.google",
)
MAX_URL = 2000
MAX_TEXT = 300
PLACEHOLDER_HOSTS = ("example.com", "example.org", "example.net")
PLACEHOLDER_SEGMENT = re.compile(r"^(your-?[a-z0-9-]*|username|handle|user-?name|page-?name|business-?name|company-?name)$")
SCHEME = re.compile(r"^([a-z][a-z0-9+.\-]*):", re.I)
DANGEROUS_SCHEMES = ("javascript", "data", "vbscript", "file", "http", "https", "mailto", "tel", "ftp", "blob")
CONTROL = re.compile(r"[\x00-\x1F\x7F]")


class ApplyError(RuntimeError):
    """A write or read-back did not match: the run stops loudly."""


# --------------------------------------------------------------------------------------
# Pure functions
# --------------------------------------------------------------------------------------

def _strip_scheme(value: str, scheme: str) -> str:
    return re.sub(rf"^{scheme}:", "", value.strip(), flags=re.I).strip()


def stored_value(key: str, address: str) -> str:
    """The value Site Info should hold for a draft address (tel:/mailto: wrappers removed)."""
    value = address.strip()
    if key == "phone":
        return _strip_scheme(value, "tel")
    if key == "email":
        return _strip_scheme(value, "mailto").split("?", 1)[0].strip()
    return value


def _scheme(value: str) -> str:
    match = SCHEME.match(value.strip())
    return match.group(1).lower() if match else ""


def _social_problem(key: str, value: str) -> str | None:
    scheme = _scheme(value)
    if scheme not in ("http", "https"):
        return f"scheme {scheme or 'missing'} is not a web address"
    parts = urlsplit(value)
    host = (parts.hostname or "").lower()
    if not host:
        return "no host"
    for placeholder in PLACEHOLDER_HOSTS:
        if host == placeholder or host.endswith("." + placeholder):
            return f"placeholder host {placeholder}"
    segments = [s for s in parts.path.split("/") if s]
    if not segments:
        return "no profile path (bare host)"
    for segment in segments:
        cleaned = segment.lstrip("@").lower().replace("_", "-")
        if PLACEHOLDER_SEGMENT.match(cleaned):
            return f"placeholder path segment {segment}"
    if key == "socials.whatsapp" and host in ("wa.me", "www.wa.me") and not re.fullmatch(r"\+?[0-9]{6,}", segments[0]):
        return "whatsapp number is not digits"
    return None


def _phone_problem(value: str) -> str | None:
    scheme = _scheme(value)
    if scheme and scheme != "tel":
        return f"scheme {scheme} not allowed for a phone"
    number = stored_value("phone", value)
    if not number or not re.fullmatch(r"\+?[0-9()\s.\-]+", number):
        return "phone is not a number"
    digits = re.sub(r"\D", "", number)
    if not 7 <= len(digits) <= 15:
        return "phone digit count out of range"
    if len(set(digits)) == 1 or digits in ("1234567", "12345678", "123456789", "1234567890"):
        return "placeholder phone number"
    return None


def _email_problem(value: str) -> str | None:
    scheme = _scheme(value)
    if scheme and scheme != "mailto":
        return f"scheme {scheme} not allowed for an email"
    address = stored_value("email", value)
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", address):
        return "email is not an address"
    local, host = address.rsplit("@", 1)
    host = host.lower()
    for placeholder in PLACEHOLDER_HOSTS:
        if host == placeholder or host.endswith("." + placeholder):
            return f"placeholder host {placeholder}"
    if PLACEHOLDER_SEGMENT.match(local.lower()):
        return f"placeholder email name {local}"
    return None


def address_problem(key: str, address: str) -> str | None:
    """Why a draft address must not be written for this key, or None when it is acceptable."""
    if key not in ALLOWED_KEYS:
        return "not a Site Info key this script fills"
    raw = address if isinstance(address, str) else ""
    if CONTROL.search(raw):
        return "control characters (CR/LF) in address"
    value = raw.strip()
    if value in ("", "#"):
        return "empty address"
    if len(value) > (MAX_TEXT if key in ("phone", "email", "address") else MAX_URL):
        return "address too long"
    if key == "phone":
        return _phone_problem(value)
    if key == "email":
        return _email_problem(value)
    if key == "address":
        scheme = _scheme(value)
        if scheme in DANGEROUS_SCHEMES:
            return f"scheme {scheme} is not a postal address"
        return None
    return _social_problem(key, value)


def read_entries(paths: list[Path]) -> tuple[list[dict], int]:
    """Handover entries owned by site-info that carry a key and an address, plus how many were ignored."""
    kept: list[dict] = []
    ignored = 0
    for path in paths:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        if isinstance(data, dict):
            data = data.get("handover", data.get("entries", []))
        for item in data if isinstance(data, list) else []:
            if not isinstance(item, dict) or item.get("owner") != "site-info":
                ignored += 1
                continue
            evidence = item.get("evidence") if isinstance(item.get("evidence"), dict) else {}
            key = item.get("key") or evidence.get("key")
            address = item.get("address") if "address" in item else evidence.get("draft")
            if not isinstance(key, str) or not key or not isinstance(address, str):
                ignored += 1
                continue
            ref = item.get("ref") or evidence.get("ref") or item.get("node") or ""
            kept.append({"key": key, "address": address, "ref": str(ref), "source": str(path)})
    return kept, ignored


def plan(entries: list[dict], current: dict) -> list[dict]:
    """One row per distinct (key, address): key, current, address, value, action, reason, refs."""
    rows: list[dict] = []
    keys = list(dict.fromkeys(e["key"] for e in entries))
    for key in keys:
        have = str(current.get(key, "") or "")
        distinct: dict[str, list[str]] = {}
        for e in entries:
            if e["key"] == key:
                distinct.setdefault(e["address"].strip(), []).append(e["ref"])

        def row(address: str, refs: list[str], action: str, reason: str = "", value: str = "") -> dict:
            return {"key": key, "current": have, "address": address, "value": value,
                    "action": action, "reason": reason, "refs": refs}

        if have.strip():
            rows += [row(a, r, "SKIP", "already set") for a, r in distinct.items()]
            continue
        valid: dict[str, list[tuple[str, list[str]]]] = {}
        for address, refs in distinct.items():
            problem = address_problem(key, address)
            if problem:
                rows.append(row(address, refs, "SKIP", problem))
            else:
                valid.setdefault(stored_value(key, address), []).append((address, refs))
        if len(valid) > 1:
            for value, group in valid.items():
                rows += [row(a, r, "SKIP", "conflicting addresses", value) for a, r in group]
        elif valid:
            value, group = next(iter(valid.items()))
            refs = [ref for _, rs in group for ref in rs]
            rows.append(row(group[0][0], refs, "WRITE", "", value))
    return rows


def _clip(text: str, width: int = 48) -> str:
    text = text.replace("\n", " ")
    return text if len(text) <= width else text[: width - 1] + "…"


def format_table(rows: list[dict]) -> str:
    """key | current value | proposed address | WRITE or SKIP (reason)."""
    header = ("key", "current value", "proposed address", "result")
    body = [(r["key"], _clip(r["current"]) or "-", _clip(r["address"]) or "-",
             "WRITE" if r["action"] == "WRITE" else f"SKIP ({r['reason']})") for r in rows]
    widths = [max(len(line[i]) for line in [header, *body]) for i in range(4)]
    lines = [" | ".join(cell.ljust(widths[i]) for i, cell in enumerate(line)).rstrip() for line in [header, *body]]
    lines.insert(1, "-+-".join("-" * w for w in widths))
    return "\n".join(lines)


def flatten(option: dict, prefix: str = "") -> dict:
    """Nested option array to dotted keys, so 'socials' => ['instagram' => x] compares as socials.instagram."""
    out: dict = {}
    for name, value in option.items():
        dotted = f"{prefix}{name}"
        if isinstance(value, dict):
            out.update(flatten(value, dotted + "."))
        else:
            out[dotted] = value
    return out


def serialise(option: dict) -> bytes:
    """The backup bytes: UTF-8, LF, two-space indent, no trailing newline."""
    return json.dumps(option, ensure_ascii=False, indent=2).encode("utf-8")


def apply_rows(site, name: str, rows: list[dict], backup_root: Path, today: str) -> dict:
    """Back up, write every WRITE row, read back, and raise ApplyError on any difference."""
    writes = {r["key"]: r["value"] for r in rows if r["action"] == "WRITE"}
    if not writes:
        return {"written": {}, "backup": None, "backup_md5": None, "new_md5": None, "sanitised": {}}
    before = site.read_option()
    backup = Path(backup_root) / today / name / "sgs_site_info.json"
    backup.parent.mkdir(parents=True, exist_ok=True)
    payload = serialise(before)
    backup.write_bytes(payload)
    backup_md5 = hashlib.md5(payload).hexdigest()
    if hashlib.md5(backup.read_bytes()).hexdigest() != backup_md5:
        raise ApplyError(f"backup {backup} did not read back identically")

    results = site.write_values(writes)
    for key in writes:
        if not results.get(key, {}).get("ok"):
            raise ApplyError(f"Sgs_Site_Info::set refused {key}; backup is at {backup} (md5 {backup_md5})")

    after = site.read_option()
    finals = site.read_values(list(writes))
    for key in writes:
        if not str(finals.get(key, "")).strip():
            raise ApplyError(f"{key} reads back empty after set()")
        if finals[key] != results[key]["value"]:
            raise ApplyError(f"{key} read-back {finals[key]!r} differs from the value set() reported {results[key]['value']!r}")
    was, now = flatten(before), flatten(after)
    for key in set(was) | set(now):
        if key not in writes and was.get(key) != now.get(key):
            raise ApplyError(f"{key} changed during the write although it was not a proposed key")
    return {
        "written": finals, "backup": str(backup), "backup_md5": backup_md5,
        "new_md5": hashlib.md5(serialise(after)).hexdigest(),
        "sanitised": {k: finals[k] for k in writes if finals[k] != writes[k]},
    }


# --------------------------------------------------------------------------------------
# SSH layer (thin; tests replace the site with a fake)
# --------------------------------------------------------------------------------------

def load_targets() -> tuple[dict, list[str], str]:
    spec = importlib.util.spec_from_file_location("build_deploy", SCRIPTS / "build-deploy.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # guarded by `if __name__ == "__main__"`
    return module.TARGETS, module.SSH_FALLBACK, module.SSH_USER_HOST


READ_OPTION_PHP = r"""
echo wp_json_encode( (object) (array) \SGS\Blocks\Sgs_Site_Info::all() );
"""

READ_VALUES_PHP = r"""
$keys = json_decode( base64_decode( (string) ( $args[0] ?? '' ), true ), true );
$out  = array();
foreach ( (array) $keys as $k ) {
	$v         = \SGS\Blocks\Sgs_Site_Info::get( (string) $k );
	$out[ $k ] = is_scalar( $v ) ? (string) $v : '';
}
echo wp_json_encode( (object) $out );
"""

WRITE_VALUES_PHP = r"""
$items = json_decode( base64_decode( (string) ( $args[0] ?? '' ), true ), true );
$out   = array();
foreach ( (array) $items as $k => $v ) {
	$k = (string) $k;
	if ( ! is_string( $v ) || ! in_array( $k, \SGS\Blocks\Sgs_Site_Info::known_keys(), true ) ) {
		$out[ $k ] = array( 'ok' => false, 'value' => '' );
		continue;
	}
	$existing = \SGS\Blocks\Sgs_Site_Info::get( $k );
	if ( is_scalar( $existing ) && '' !== trim( (string) $existing ) ) {
		$out[ $k ] = array( 'ok' => false, 'value' => (string) $existing );
		continue;
	}
	$ok        = \SGS\Blocks\Sgs_Site_Info::set( $k, $v );
	$now       = \SGS\Blocks\Sgs_Site_Info::get( $k );
	$out[ $k ] = array( 'ok' => $ok, 'value' => is_scalar( $now ) ? (string) $now : '' );
}
echo wp_json_encode( (object) $out );
"""


class Site:
    def __init__(self, target: str):
        targets, ssh_fallback, user_host = load_targets()
        if target not in targets:
            sys.exit(f"ERROR: unknown site {target!r}; known: {', '.join(targets)}")
        root = targets[target]["wp_content"].rsplit("/wp-content", 1)[0]
        self.ssh = ["ssh", *ssh_fallback, "-o", "BatchMode=yes", user_host]
        self.cd = f"cd {shlex.quote(root)} && "

    def php(self, code: str, *args: str, user: str = "") -> dict:
        """Run PHP through `wp eval-file -`; the code echoes one JSON object."""
        quoted = " ".join(shlex.quote(a) for a in args)
        flag = f"--user={shlex.quote(user)} " if user else ""
        result = subprocess.run(
            [*self.ssh, self.cd + f"wp {flag}eval-file - {quoted}"],
            input=("<?php\n" + code).encode("utf-8"), capture_output=True, timeout=180,
        )
        stdout = result.stdout.decode("utf-8", "replace")
        try:
            return json.loads(stdout.strip().splitlines()[-1])
        except (IndexError, json.JSONDecodeError):
            sys.exit(f"ERROR: remote PHP failed\n{stdout}\n{result.stderr.decode('utf-8', 'replace')}")

    @staticmethod
    def _encode(data) -> str:
        return base64.b64encode(json.dumps(data).encode("utf-8")).decode("ascii")

    def read_option(self) -> dict:
        return self.php(READ_OPTION_PHP)

    def read_values(self, keys: list[str]) -> dict:
        return self.php(READ_VALUES_PHP, self._encode(keys))

    def write_values(self, values: dict) -> dict:
        return self.php(WRITE_VALUES_PHP, self._encode(values), user=WP_USER)


# --------------------------------------------------------------------------------------

def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--site", "--target", dest="site", required=True, help="a build-deploy.py TARGETS key")
    parser.add_argument("--handover", type=Path, action="append", required=True, nargs="+",
                        help="one or more handover.json paths")
    parser.add_argument("--apply", action="store_true", help="write the proposed keys (default: dry run)")
    parser.add_argument("--backup-root", type=Path, default=DEFAULT_BACKUP_ROOT, help=argparse.SUPPRESS)
    args = parser.parse_args()

    paths = [p for group in args.handover for p in group]
    missing = [str(p) for p in paths if not p.is_file()]
    if missing:
        sys.exit(f"ERROR: handover file not found: {', '.join(missing)}")
    entries, ignored = read_entries(paths)
    print(f"{len(entries)} site-info entries with a key and an address ({ignored} other entries ignored)")
    if not entries:
        return 0

    site = Site(args.site)
    keys = [k for k in dict.fromkeys(e["key"] for e in entries) if k in ALLOWED_KEYS]
    current = site.read_values(keys) if keys else {}
    rows = plan(entries, current)
    print(format_table(rows))
    writes = sum(1 for r in rows if r["action"] == "WRITE")
    print(f"\n{writes} to write, {len(rows) - writes} skipped.")
    if not args.apply:
        print("DRY RUN: nothing written. Re-run with --apply to write.")
        return 0

    try:
        report = apply_rows(site, args.site, rows, args.backup_root, datetime.date.today().isoformat())
    except ApplyError as error:
        print(f"FAILED: {error}", file=sys.stderr)
        return 1
    if not report["backup"]:
        print("Nothing to write.")
        return 0
    print(f"backup: {report['backup']} (md5 {report['backup_md5']})")
    print(f"option md5 after write: {report['new_md5']}")
    for key, value in report["written"].items():
        print(f"  {key} = {value}")
    for key, value in report["sanitised"].items():
        print(f"  note: set() sanitised {key} to {value!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
