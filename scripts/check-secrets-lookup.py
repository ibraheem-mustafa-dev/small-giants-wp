#!/usr/bin/env python3
"""
check-secrets-lookup.py: a site's secrets file and key come from its calibration-targets entry, never from its name.

THE RULE (Bean, 2026-11-23)
---------------------------
A site's logins live in the file and under the key its entry in `scripts/computed-route/calibration-targets.json`
(plus the gitignored `calibration-targets.local.json`) names: `envFile` and `envKey`. The deploy target and route site
`mamas-test` reads `.claude/secrets/live-mamas.env` with keys `WP_*_MAMAS`, so a reader that builds
`.claude/secrets/<site>.env` or `WP_URL_<SITE UPPER>` from the name finds nothing. The lookups:

  Node and route code   scripts/computed-route/lib/site-targets.mjs::secretsOf (then secretsPath)
  Python                plugins/sgs-blocks/scripts/lib/site_secrets.py::secrets_of
  shell                 scripts/computed-route/tools/site-secrets.mjs <site>   (prints the file, a tab, the key)

A name with no entry falls back to `.claude/secrets/<name>.env` and its derived key (a scratch copy of a mirror), and that
fallback is written once in each lookup above. Reading a secrets file by a name that is not a site (a fixed
`sandybrown.env`, `email.env`) is not a name-built path and is not reported.

WHAT IS REPORTED
----------------
  path   a line that mentions "secrets" and puts a variable in front of `.env` (`${ site }.env`, `{site}.env`, `$name.env`)
  key    a line that derives a key by upper-casing a name (`site.toUpperCase().replace(...)`, `re.sub(...).upper()`,
         `tr 'a-z' 'A-Z'`)

SCOPE: tracked and untracked-but-not-ignored .py .mjs .cjs .js .sh files, outside node_modules, vendor, build output,
archives, reports, test folders and test files, and this file (a test builds a temporary secrets folder with a literal name).

MODES
-----
  --survey [--json]   every hit, by file, and the exempt ones with their reason
  --check             exit 1 on a hit that is not exempt, or an exemption that no longer matches anything
  --self-test         the detector flags each planted shape and ignores the clean ones
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

REPO = Path(__file__).resolve().parent.parent

EXTENSIONS = (".py", ".mjs", ".cjs", ".js", ".sh")
SKIP_PARTS = ("node_modules/", "/vendor/", "/build/", "/archive/", "/reports/", "/tests/", "/test/", "/fixtures/", "/backups/")
SKIP_NAMES = re.compile(r"(^|/)(test_[^/]*|[^/]*\.test\.[a-z]+)$")

# A variable in front of `.env`: JS `${ x }.env`, Python `{x}.env`, shell `$x.env` or `${x}.env`.
VAR_BEFORE_ENV = re.compile(r"(\$\{[^}]*\}|\{[A-Za-z_][\w.\[\]'\"]*\}|\$[A-Za-z_]\w*)\.env\b|\+\s*['\"]\.env['\"]")
# A key made from a name.
KEY_FROM_NAME = re.compile(r"toUpperCase\(\)\s*\.replace\(|re\.sub\([^)]*\)\s*\.upper\(\)|\.upper\(\)\.replace\(|\btr\s+(-d\s+'-'\s*\|\s*tr\s+)?'(a-z|\[:lower:\])")

# (relative path, rule) -> reason. Each entry must still match a line, or --check fails on it.
EXEMPT: Dict[Tuple[str, str], str] = {
    ("scripts/computed-route/lib/site-targets.mjs", "path"): "conventionalSecrets and scratchEntry: the one fallback for a name with no entry",
    ("scripts/computed-route/lib/site-targets.mjs", "key"): "conventionalSecrets and scratchEntry: the one fallback for a name with no entry",
    ("scripts/local-wp/scratch-mirror.sh", "path"): "writes and reads the login file of a scratch copy and of its committed mirror, whose entries name <name>.env",
    ("scripts/local-wp/scratch-mirror.sh", "key"): "writes both key spellings of a scratch copy's name into its own login file",
}


def tracked_files() -> List[str]:
    out = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "--", *[f"*{e}" for e in EXTENSIONS]],
        cwd=REPO, capture_output=True, text=True, check=True,
    ).stdout.split("\n")
    return sorted(f for f in out if f and not scoped_out(f))


def scoped_out(rel: str) -> bool:
    slashed = "/" + rel
    return rel == "scripts/check-secrets-lookup.py" or any(p in slashed for p in SKIP_PARTS) or bool(SKIP_NAMES.search(rel))


def scan_text(text: str) -> List[Tuple[int, str, str]]:
    """(line number, rule, line) for each name-built path or key in `text`."""
    hits = []
    for number, line in enumerate(text.splitlines(), 1):
        if "secrets" in line.lower() and VAR_BEFORE_ENV.search(line):
            hits.append((number, "path", line.strip()))
        if KEY_FROM_NAME.search(line):
            hits.append((number, "key", line.strip()))
    return hits


def survey() -> Tuple[List[dict], List[dict], List[str]]:
    """(hits, exempt hits, stale exemption keys) over the whole scope."""
    hits, exempt, seen = [], [], set()
    for rel in tracked_files():
        try:
            text = (REPO / rel).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for number, rule, line in scan_text(text):
            row = {"file": rel, "line": number, "rule": rule, "text": line[:160]}
            reason = EXEMPT.get((rel, rule))
            if reason:
                seen.add((rel, rule))
                exempt.append({**row, "reason": reason})
            else:
                hits.append(row)
    stale = [f"{rel} ({rule})" for (rel, rule) in EXEMPT if (rel, rule) not in seen]
    return hits, exempt, stale


def run_survey(as_json: bool) -> int:
    hits, exempt, stale = survey()
    if as_json:
        print(json.dumps({"hits": hits, "exempt": exempt, "stale_exemptions": stale}, indent=2))
        return 0
    print(f"{len(hits)} name-built secrets lookups, {len(exempt)} exempt, {len(stale)} stale exemptions")
    for row in hits:
        print(f"  {row['file']}:{row['line']} [{row['rule']}] {row['text']}")
    for row in exempt:
        print(f"  exempt {row['file']}:{row['line']} [{row['rule']}] {row['reason']}")
    for name in stale:
        print(f"  stale exemption: {name}")
    return 0


def run_check() -> int:
    hits, _exempt, stale = survey()
    for row in hits:
        print(f"{row['file']}:{row['line']} [{row['rule']}] builds a secrets {'path' if row['rule'] == 'path' else 'key'} from a site name: {row['text']}")
    for name in stale:
        print(f"stale exemption (nothing matches it any more, remove it): {name}")
    if hits or stale:
        print("A site's secrets file and key come from its calibration-targets entry: scripts/computed-route/lib/site-targets.mjs::secretsOf (Node), plugins/sgs-blocks/scripts/lib/site_secrets.py::secrets_of (Python), scripts/computed-route/tools/site-secrets.mjs (shell).")
        return 1
    print("check-secrets-lookup: no secrets path or key is built from a site name")
    return 0


# Planted shapes: (text, expected rules). The clean ones must report nothing.
FIXTURES = [
    ("const f = path.join( REPO, '.claude', 'secrets', `${ site }.env` );", {"path"}),
    ("path = SECRETS / f\"{site}.env\"", {"path"}),
    ("grep -E \"^WP_URL_${key}=\" \"$REPO/.claude/secrets/$name.env\"", {"path"}),
    ("grep x \"$SECRETS_DIR/${name}.env\"", {"path"}),
    ("const file = '.claude/secrets/' + site + '.env';", {"path"}),
    ("const suffix = site.toUpperCase().replace( /[^A-Z0-9]/g, '' );", {"key"}),
    ("suffix = re.sub(r\"[^A-Za-z0-9]\", \"\", site).upper()", {"key"}),
    ("key=\"$( echo \"$name\" | tr '[:lower:]' '[:upper:]' | tr -d '-' )\"", {"key"}),
    ("key_a=\"$(echo \"$name\" | tr -d '-' | tr 'a-z' 'A-Z')\"", {"key"}),
    ("const file = path.join( '.claude', 'secrets', 'sandybrown.env' );", set()),
    ("// Credentials come from `.claude/secrets/<site>.env`.", set()),
    ("const url = `${ base }/x.env`;", set()),
    ("const { envFile, envKey } = secretsOf( site, targets );", set()),
    ("const title = label.toUpperCase();", set()),
]


def run_self_test() -> int:
    failures = []
    for text, expected in FIXTURES:
        got = {rule for _n, rule, _l in scan_text(text)}
        if got != expected:
            failures.append(f"{text!r}: expected {sorted(expected)}, got {sorted(got)}")
    for rel in ("node_modules/x/a.js", "plugins/p/tests/a.py", "scripts/computed-route/tests/a.mjs", "scripts/test_a.py", "scripts/a.test.mjs", ".claude/reports/a.py"):
        if not scoped_out(rel):
            failures.append(f"{rel} should be out of scope")
    if scoped_out("scripts/computed-route/lib/media-upload.mjs"):
        failures.append("scripts/computed-route/lib/media-upload.mjs should be in scope")
    for rel, rule in EXEMPT:
        if not (REPO / rel).exists():
            failures.append(f"exemption names a missing file: {rel}")
    for failure in failures:
        print("FAIL", failure)
    print(f"check-secrets-lookup self-test: {'FAILED' if failures else 'ok'} ({len(FIXTURES)} shapes)")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--survey", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return run_self_test()
    if args.check:
        return run_check()
    return run_survey(args.json)


if __name__ == "__main__":
    sys.exit(main())
