#!/usr/bin/env python3
"""check-palette-slug-refs.py — every referenced colour slug must actually exist.

WHY THIS EXISTS
---------------
A reference to a palette slug that does not exist fails SILENTLY. `var(--wp--preset--color--X, #fff)`
where X is not a real slug resolves to nothing, so the fallback wins — permanently. Nothing errors,
nothing warns, and the rendered page looks completely fine.

The cost is that the property can never be re-skinned per client, which is exactly what Spec 32
FR-32-2 promises ("changing only the snapshot token re-skins the block with no block-code change")
and what §3 requires ("per-client values flow through theme.json.settings.custom").

Found 2026-08-18: **72 references to 19 non-existent slugs** across 432 files. Most were WordPress
CORE's default palette names (`base`, `foreground`, `contrast`, `contrast-2`) — blocks written
against core's palette instead of the SGS one. The trigger was Spec 32 §12.5's `border-subtle`:
`border` was the only colour family with variants and no base, so an author reasonably wrote
`--wp--preset--color--border` by analogy with `primary`/`surface`/`text`, and it silently did
nothing while a client hex hardcoded beside it won on every site.

A slug is considered REAL if it appears in the framework `theme.json` palette OR in any client
snapshot's palette (a client may legitimately carry extra slugs of its own).

USAGE
    python check-palette-slug-refs.py --check      # exit 1 on any finding
    python check-palette-slug-refs.py --survey     # census of every slug referenced
    python check-palette-slug-refs.py --self-test  # negative control: proves it can fail
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys
import tempfile
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_REPO_ROOT = _HERE.parent.parent.parent

_REF_RE = re.compile(r"--wp--preset--color--([a-z0-9-]+)")
_COMMENT_START = ("//", "*", "#", "/*")


def _known_slugs(repo: Path) -> set[str]:
    """Every slug the framework theme OR any client snapshot declares."""
    slugs: set[str] = set()
    for p in [repo / "theme" / "sgs-theme" / "theme.json"] + sorted(
            (repo / "sites").glob("*/theme-snapshot.json")):
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for entry in d.get("settings", {}).get("color", {}).get("palette", []) or []:
            if isinstance(entry, dict) and entry.get("slug"):
                slugs.add(entry["slug"])
    return slugs


def _targets(repo: Path) -> list[Path]:
    pats = ["plugins/sgs-blocks/src/blocks/*/*.css", "plugins/sgs-blocks/src/blocks/*/*.php",
            "plugins/sgs-blocks/includes/*.php", "theme/sgs-theme/**/*.css",
            "theme/sgs-theme/**/*.php"]
    out: list[Path] = []
    for pat in pats:
        out.extend(Path(p) for p in glob.glob(str(repo / pat), recursive=True))
    return sorted(set(out))


def scan(repo: Path):
    """Return (findings, seen, files_scanned). A finding is (path, line_no, slug, text)."""
    known = _known_slugs(repo)
    findings, seen = [], {}
    files = _targets(repo)
    for f in files:
        try:
            txt = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        txt = re.sub(r"/\*.*?\*/", "", txt, flags=re.S)   # block comments
        for i, line in enumerate(txt.splitlines(), 1):
            if line.strip().startswith(_COMMENT_START):
                continue
            for slug in _REF_RE.findall(line):
                seen[slug] = seen.get(slug, 0) + 1
                if slug not in known:
                    findings.append((str(f.relative_to(repo)).replace(os.sep, "/"),
                                     i, slug, line.strip()[:100]))
    return findings, seen, len(files)


def run_check(repo: Path) -> int:
    findings, _, n = scan(repo)
    print("[check-palette-slug-refs]\n")
    print(f"Files scanned: {n}")
    if not findings:
        print("References to non-existent palette slugs: 0")
        print("\n[check-palette-slug-refs] PASS")
        return 0
    print(f"References to non-existent palette slugs: {len(findings)}\n")
    for path, line, slug, text in findings:
        print(f"  {path}:{line}")
        print(f"    --wp--preset--color--{slug} is not a slug in theme.json or any client snapshot")
        print(f"    {text}")
    print(f"\n[check-palette-slug-refs] FAILED — {len(findings)} reference(s) resolve to nothing.")
    print("    A var() with no matching slug silently falls back forever, so the property")
    print("    can never be re-skinned per client (Spec 32 FR-32-2 / §3).")
    return 1


def run_survey(repo: Path) -> int:
    findings, seen, n = scan(repo)
    known = _known_slugs(repo)
    print("[check-palette-slug-refs] SURVEY\n")
    print(f"Files scanned: {n}   distinct slugs referenced: {len(seen)}   known slugs: {len(known)}\n")
    for slug, count in sorted(seen.items(), key=lambda kv: -kv[1]):
        print(f"  {'   ' if slug in known else '  !'} {slug:18} {count}")
    if findings:
        print(f"\n  ! = not a real slug ({len({f[2] for f in findings})} distinct)")
    return 0


def run_self_test() -> int:
    """Negative control — prove the gate rejects a phantom slug and accepts a real one."""
    print("[check-palette-slug-refs --self-test]\n")
    failures = []

    def assert_(label, cond):
        print(f"  {'PASS' if cond else 'FAIL'}  {label}")
        if not cond:
            failures.append(label)

    root = Path(tempfile.mkdtemp(prefix="cpsr-"))
    (root / "theme" / "sgs-theme").mkdir(parents=True)
    (root / "theme" / "sgs-theme" / "theme.json").write_text(json.dumps(
        {"settings": {"color": {"palette": [
            {"slug": "primary", "color": "#1F7A7A"},
            {"slug": "border", "color": "#D4DBE5"},
        ]}}}), encoding="utf-8")
    (root / "sites" / "acme").mkdir(parents=True)
    (root / "sites" / "acme" / "theme-snapshot.json").write_text(json.dumps(
        {"settings": {"color": {"palette": [{"slug": "client-only", "color": "#123456"}]}}}),
        encoding="utf-8")
    bd = root / "plugins" / "sgs-blocks" / "src" / "blocks" / "probe"
    bd.mkdir(parents=True)

    def write(css):
        (bd / "style.css").write_text(css, encoding="utf-8")

    write(".a{color:var(--wp--preset--color--primary,#000);}")
    assert_("a REAL framework slug is not flagged", len(scan(root)[0]) == 0)

    write(".a{color:var(--wp--preset--color--ghost,#000);}")
    assert_("a PHANTOM slug IS flagged", len(scan(root)[0]) == 1)

    write(".a{color:var(--wp--preset--color--client-only,#000);}")
    assert_("a slug from a CLIENT snapshot is not flagged", len(scan(root)[0]) == 0)

    # The real historical bug: `border` existed only as `border-subtle`.
    write(".a{border:1px solid var(--wp--preset--color--border,#e8d5c0);}")
    assert_("the real 2026-08-18 case (`border`) passes now it exists", len(scan(root)[0]) == 0)

    # Hyphen-boundary: `border-nope` must not be excused by real slug `border`.
    write(".a{color:var(--wp--preset--color--border-nope,#000);}")
    assert_("a hyphenated sibling of a real slug IS flagged", len(scan(root)[0]) == 1)

    write("/* var(--wp--preset--color--ghost) in a block comment */\n.a{color:red;}")
    assert_("a slug inside a comment is NOT flagged", len(scan(root)[0]) == 0)

    write("// var(--wp--preset--color--ghost) in a line comment\n.a{color:red;}")
    assert_("a slug in a line comment is NOT flagged", len(scan(root)[0]) == 0)

    import shutil
    shutil.rmtree(root, ignore_errors=True)
    print("\n[check-palette-slug-refs --self-test] "
          + ("ALL ASSERTIONS PASS." if not failures else f"{len(failures)} FAILURE(S)."))
    return 0 if not failures else 1


def main() -> int:
    if "--self-test" in sys.argv:
        return run_self_test()
    if "--survey" in sys.argv:
        return run_survey(_REPO_ROOT)
    return run_check(_REPO_ROOT) if "--check" in sys.argv else run_survey(_REPO_ROOT)


if __name__ == "__main__":
    sys.exit(main())
