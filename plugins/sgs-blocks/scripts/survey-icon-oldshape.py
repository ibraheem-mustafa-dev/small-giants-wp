#!/usr/bin/env python3
"""survey-icon-oldshape.py - find stored blocks that still carry the pre-rebuild icon shapes.

Before a deploy that ships the rebuilt sgs/social-icons (a wrapper of sgs/icon children) and the
new sgs/icon attribute model, every post that still stores an old shape must be rebuilt first, or
build-deploy.py's oldshape audit refuses the deploy (and the editor would drop the old values). This
lists, per post:

  - wp:sgs/social-icons carrying any attribute the current block.json does not declare (the old
    repeater `icons`, `source`, `iconStyle`, `iconBackground`, ...);
  - wp:sgs/icon carrying `backgroundShape`, `backgroundPadding` or `shapeColourHover` (removed), or
    a numeric `iconSize` (now a per-device object).

Undeclared attributes are read from the block's own block.json at run time, never a hand list.

Usage (read-only; nothing is ever written to a site):
  python survey-icon-oldshape.py --target eye-care-test     # a build-deploy.py TARGETS name or a host, over ssh
  python survey-icon-oldshape.py --file dump.json           # [{"ID":1,"post_type":"page","post_content":"..."}]
  python survey-icon-oldshape.py --file post.html           # one post's raw content
  python survey-icon-oldshape.py --self-test                # prove it finds each shape and passes clean content

Exit codes: 0 nothing found, 1 old shapes found, 2 input/connection error.
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import subprocess
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]
BLOCKS = PLUGIN / "src" / "blocks"
BUILD_DEPLOY = PLUGIN / "scripts" / "build-deploy.py"

# WP_Block_Parser's own delimiter shape: name, optional attribute JSON, optional void slash.
BLOCK_RE = re.compile(r"<!--\s+wp:([a-z][a-z0-9_-]*/[a-z][a-z0-9_-]*)\s+(\{(?:(?!-->).)*?\})?\s*(/)?-->", re.S)
ICON_REMOVED = ("backgroundShape", "backgroundPadding", "shapeColourHover")
GLOBAL_ATTRS = {"metadata", "className", "anchor", "lock", "style"}


def declared(slug: str) -> set[str]:
    """Attributes the block's current block.json declares."""
    meta = json.loads((BLOCKS / slug / "block.json").read_text(encoding="utf-8"))
    return set(meta.get("attributes", {}))


def findings_for(content: str, social_declared: set[str]) -> list[str]:
    """Every old shape in one post's content, as readable lines."""
    out: list[str] = []
    for m in BLOCK_RE.finditer(content):
        name, raw = m.group(1), m.group(2)
        try:
            attrs = json.loads(raw) if raw else {}
        except ValueError:
            out.append(f"{name}: unreadable attribute JSON")
            continue
        if not isinstance(attrs, dict):
            continue
        if "sgs/social-icons" == name:
            old = sorted(k for k in attrs if k not in social_declared and k not in GLOBAL_ATTRS)
            if old:
                out.append(f"sgs/social-icons: old attributes {', '.join(old)}")
        elif "sgs/icon" == name:
            old = [k for k in ICON_REMOVED if k in attrs]
            if isinstance(attrs.get("iconSize"), (int, float)) and not isinstance(attrs.get("iconSize"), bool):
                old.append(f"iconSize={attrs['iconSize']} (number)")
            if old:
                out.append(f"sgs/icon: {', '.join(old)}")
    return out


def survey(posts: list[dict]) -> dict[str, list[str]]:
    social = declared("social-icons")
    report: dict[str, list[str]] = {}
    for post in posts:
        found = findings_for(str(post.get("post_content", "")), social)
        if found:
            report[f"{post.get('post_type', '?')} #{post.get('ID', '?')}"] = found
    return report


def target_host(name: str) -> str:
    """A build-deploy.py TARGETS name's host (read from the file's literal dict), or the name itself."""
    tree = ast.parse(BUILD_DEPLOY.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and "TARGETS" == t.id for t in node.targets):
            targets = ast.literal_eval(node.value)
            if name in targets:
                return targets[name]["host"]
    return name


SSH = ["ssh", "-o", "BatchMode=yes", "-i", str(Path.home() / ".ssh" / "id_ed25519"), "-p", "65002",
       "u945238940@141.136.39.73"]  # build-deploy.py's SSH_FALLBACK + SSH_USER_HOST (the `hd` alias is Git Bash only)


def ssh(command: str, stdin: str = "") -> str:
    """Run one read-only command on the shared host (UTF-8 bytes both ways, so no CRLF or code-page rewrite)."""
    done = subprocess.run([*SSH, command], input=stdin.encode("utf-8"), capture_output=True, timeout=600)
    done.stdout = done.stdout.decode("utf-8")
    done.stderr = done.stderr.decode("utf-8", "replace")
    if 0 != done.returncode:
        raise RuntimeError(done.stderr.strip() or f"ssh exited {done.returncode}")
    return done.stdout


def posts_from_target(name: str) -> list[dict]:
    """Every post of every type that mentions sgs/icon or sgs/social-icons, read with wp-cli only."""
    host = target_host(name)
    if not re.fullmatch(r"[a-z0-9.-]+", host):
        raise RuntimeError(f"unexpected host {host!r}")
    # One read-only query, sent as a PHP file on stdin so no content or quoting passes through the remote shell.
    php = (
        "<?php global $wpdb; echo wp_json_encode( $wpdb->get_results( \"SELECT ID, post_type, post_content FROM "
        "{$wpdb->posts} WHERE post_type <> 'revision' AND ( post_content LIKE '%wp:sgs/icon %' "
        "OR post_content LIKE '%wp:sgs/social-icons%' )\", ARRAY_A ) );\n"
    )
    raw = ssh(f"cd domains/{host}/public_html && wp eval-file - --skip-plugins --skip-themes", stdin=php)
    return [{"ID": str(p["ID"]), "post_type": p["post_type"], "post_content": p["post_content"]} for p in json.loads(raw or "[]")]


def posts_from_file(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except ValueError:
        return [{"ID": path.name, "post_type": "file", "post_content": text}]
    return data if isinstance(data, list) else [data]


def print_report(report: dict[str, list[str]], scanned: int) -> int:
    print(f"[survey-icon-oldshape] {scanned} post(s) scanned; {len(report)} carry an old shape")
    for post, lines in report.items():
        for line in lines:
            print(f"  {post}: {line}")
    return 1 if report else 0


def self_test() -> int:
    old_social = '<!-- wp:sgs/social-icons {"source":"site-info","iconStyle":"boxed","iconSize":18} /-->'
    new_social = ('<!-- wp:sgs/social-icons {"colourMode":"theme","childIconSize":{"desktop":"18px"}} -->\n'
                  '<!-- wp:sgs/icon {"iconSource":"brand","brandName":"facebook","metadata":{"bindings":{"linkUrl":'
                  '{"source":"sgs/site-info","args":{"key":"socials.facebook"}}}}} /-->\n<!-- /wp:sgs/social-icons -->')
    old_icon = '<!-- wp:sgs/icon {"backgroundShape":"circle","backgroundPadding":"12px","iconSize":32} /-->'
    new_icon = '<!-- wp:sgs/icon {"shape":"circle","showBackground":true,"iconSize":{"desktop":"32px"}} /-->'
    tricky = '<!-- wp:sgs/icon {"ariaLabel":"a } b","shapeColourHover":"accent"} /-->'
    cases = [
        ("old social row found", [{"ID": 1, "post_content": old_social}], 1),
        ("old icon found", [{"ID": 2, "post_content": old_icon}], 1),
        ("a brace inside a string does not hide a removed attribute", [{"ID": 3, "post_content": tricky}], 1),
        ("new row and icon are clean", [{"ID": 4, "post_content": new_social + new_icon}], 0),
        ("mixed post reported once with every finding", [{"ID": 5, "post_content": new_social + old_icon + old_social}], 1),
    ]
    bad = 0
    for label, posts, want in cases:
        report = survey(posts)
        ok = len(report) == want
        bad += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FAIL'} {label}: {report}")
    mixed = survey(cases[4][1])
    lines = next(iter(mixed.values()))
    if 2 != len(lines) or "backgroundShape" not in lines[0] or "iconStyle" not in lines[1]:
        bad += 1
        print(f"  FAIL mixed post lists both findings in order: {lines}")
    print(f"self-test: {'FAILED' if bad else 'OK'} ({len(cases) + 1} checks)")
    return 1 if bad else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--target", help="build-deploy.py TARGETS name or host (read-only over ssh)")
    group.add_argument("--file", type=Path, help="a JSON dump of posts or one post's raw content")
    group.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    try:
        posts = posts_from_file(args.file) if args.file else posts_from_target(args.target)
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f"[survey-icon-oldshape] cannot read posts: {exc}", file=sys.stderr)
        return 2
    return print_report(survey(posts), len(posts))


if __name__ == "__main__":
    sys.exit(main())
