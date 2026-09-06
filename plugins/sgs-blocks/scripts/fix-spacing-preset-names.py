#!/usr/bin/env python3
"""fix-spacing-preset-names.py

Renames numeric spacing-preset ``name`` fields (e.g. "2".."9") in per-client
``sites/<client>/theme-snapshot.json`` files to the framework's word ladder
(XXS/XS/S/M/L/XL/XXL/XXXL), so WordPress's native spacing control shows a
real label instead of a bare digit.

## Background

``theme/sgs-theme/theme.json`` seeds ``settings.spacing.spacingSizes`` with 8
slugs (10-80) named XXS..XXXL. Five client snapshots
(eye-care-ward-end, sgs-construction, sgs-healthcare, sgs-mosque,
sgs-professional) were hand-typed in an unrelated 2026-03-18 commit with a
DIFFERENT 8-slug scale (20-90) and numeric names ("2".."9"). No generator in
this repo ever writes ``spacingSizes`` — every script that touches the key is
a reader — so this is purely a data-authoring mistake, fixed here as a data
migration, not a code change.

## Mapping method — POSITION in the ordered ladder, never the slug number

The client scale is 8 sizes at slugs 20-90; the framework scale is 8 sizes at
slugs 10-80. Both start at index 0 with the smallest step and increase
monotonically, but the slug NUMBERS are offset by one rung (client's 20 lines
up with the framework's 10, 90 with 80, etc). A slug-keyed lookup
(``by_slug["40"] = "M"``) would therefore silently misalign every entry by
one step. The actual rem sizes differ per client too (eye-care's slug 40 is
1rem; the framework's slug 40 is 1.5rem) so sizes can't be used as the join
key either. The only property both ladders share reliably is ORDER: each
ladder holds exactly 8 entries running smallest-to-largest. So the mapping is
positional — the Nth entry (by array order, not by slug) in a client's ladder
takes the Nth name from the framework's ladder (also read live, never
hardcoded, from ``theme/sgs-theme/theme.json`` — the single canonical
source).

## What is renamed vs untouched

ONLY the ``name`` field of each ``spacingSizes`` entry is ever rewritten.
``slug`` and ``size`` are load-bearing: ``slug`` is what block CSS resolves
against (``var(--wp--preset--spacing--{slug})``) and ``size`` is the actual
rem value applied on the page. Renaming either would break every block on
every page that references that preset. The script never touches them, and
the self-test explicitly asserts they are byte-identical across a run.

## Third state — no spacingSizes at all

``helping-doctors`` and ``indus-foods`` have no ``settings.spacing.spacingSizes``
key at all (not even an empty array). These are reported as SKIPPED with a
reason — the script does not invent a ladder for them; that is separate,
unrelated build work outside this fix's scope.

## Formatting preservation

The rewrite is a targeted, in-place text substitution on the ``name`` value
inside each ``spacingSizes`` array entry — not a full JSON parse-and-dump.
Every file in this repo's ``sites/`` tree uses CRLF line endings and 2-space
indentation; a round-trip through ``json.dump`` would silently flip both and
bury the real one-field change inside a whole-file diff. Only the exact
``"name": "..."`` value inside the located ``spacingSizes`` array bounds is
replaced; every other byte (including line endings) is passed through
unchanged.

Usage:
    python fix-spacing-preset-names.py                  # dry run (default)
    python fix-spacing-preset-names.py --apply           # write changes
    python fix-spacing-preset-names.py --check            # exit 1 if any file still has numeric names
    python fix-spacing-preset-names.py --self-test         # negative-control proof, no site files touched
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
import tempfile

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
THEME_JSON = os.path.join(REPO_ROOT, "theme", "sgs-theme", "theme.json")
SITES_GLOB = os.path.join(REPO_ROOT, "sites", "*", "theme-snapshot.json")

# Matches one spacingSizes array entry, capturing slug / size / name in
# order. Tolerant of an optional trailing "fluid": {...} object (present on
# theme.json / mamas-munches, which are already-correct and expected to be a
# no-op) and of either comma-or-not after "name" depending on whether fluid
# follows.
_ENTRY_RE = re.compile(
    r'\{\s*'
    r'"slug"\s*:\s*"(?P<slug>[^"]*)"\s*,\s*'
    r'"size"\s*:\s*"(?P<size>[^"]*)"\s*,\s*'
    r'"name"\s*:\s*"(?P<name>[^"]*)"'
    r'(?P<tail>\s*,\s*"fluid"\s*:\s*\{.*?\}\s*)?'
    r'\s*\}',
    re.DOTALL,
)


class NoSpacingSizes(Exception):
    """Raised when a snapshot has no settings.spacing.spacingSizes to touch."""


def find_spacingsizes_block(text: str) -> tuple[int, int]:
    """Return (start, end) byte offsets of the spacingSizes array's `[ ... ]`,
    found by bracket-depth counting (not regex) so it is exact regardless of
    nested objects inside.
    """
    key_match = re.search(r'"spacingSizes"\s*:\s*\[', text)
    if not key_match:
        raise NoSpacingSizes("no settings.spacing.spacingSizes key present")
    array_start = key_match.end() - 1  # position of the opening '['
    depth = 0
    i = array_start
    in_string = False
    escape = False
    while i < len(text):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    return array_start, i + 1
        i += 1
    raise ValueError("unterminated spacingSizes array — malformed JSON?")


def load_framework_ladder() -> list[str]:
    """Read the canonical name ladder live from theme.json. Never hardcoded,
    never written to.
    """
    with open(THEME_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    sizes = data["settings"]["spacing"]["spacingSizes"]
    return [entry["name"] for entry in sizes]


def parse_entries(block_text: str) -> list[dict]:
    entries = []
    for m in _ENTRY_RE.finditer(block_text):
        entries.append(
            {
                "slug": m.group("slug"),
                "size": m.group("size"),
                "name": m.group("name"),
                "span": m.span(),
            }
        )
    return entries


def build_renamed_block(block_text: str, entries: list[dict], ladder: list[str]) -> tuple[str, list[tuple[str, str, str]]]:
    """Return (new_block_text, changes) where changes is a list of
    (slug, old_name, new_name) for entries whose name actually changed.
    Rebuilds the block by splicing only the "name" value substring for each
    entry position — everything else in the block (whitespace, slug, size,
    fluid, commas, newlines) is passed through byte-for-byte.
    """
    if len(entries) != len(ladder):
        raise ValueError(
            f"entry count {len(entries)} != framework ladder length {len(ladder)} "
            "— refusing to map by position across mismatched ladder sizes"
        )

    changes: list[tuple[str, str, str]] = []
    # Work back-to-front so earlier span offsets stay valid as we splice.
    new_text = block_text
    for idx in reversed(range(len(entries))):
        entry = entries[idx]
        new_name = ladder[idx]
        if entry["name"] == new_name:
            continue
        changes.append((entry["slug"], entry["name"], new_name))
        obj_start, obj_end = entry["span"]
        obj_text = block_text[obj_start:obj_end]
        # Replace only the "name": "OLD" value within this object's own text.
        name_pattern = re.compile(
            r'("name"\s*:\s*")' + re.escape(entry["name"]) + r'(")'
        )
        new_obj_text, n_sub = name_pattern.subn(r"\1" + new_name + r"\2", obj_text, count=1)
        if n_sub != 1:
            raise ValueError(f"failed to locate name field to rewrite for slug {entry['slug']!r}")
        new_text = new_text[:obj_start] + new_obj_text + new_text[obj_end:]

    changes.reverse()
    return new_text, changes


def process_file(path: str, ladder: list[str], apply: bool) -> dict:
    """Process one theme-snapshot.json. Returns a report dict."""
    with open(path, "rb") as f:
        raw_bytes = f.read()
    text = raw_bytes.decode("utf-8")

    try:
        block_start, block_end = find_spacingsizes_block(text)
    except NoSpacingSizes as e:
        return {"path": path, "status": "skipped", "reason": str(e)}

    block_text = text[block_start:block_end]
    entries = parse_entries(block_text)
    if not entries:
        return {
            "path": path,
            "status": "skipped",
            "reason": "spacingSizes array present but no entries matched the expected shape",
        }

    try:
        new_block_text, changes = build_renamed_block(block_text, entries, ladder)
    except ValueError as e:
        return {"path": path, "status": "error", "reason": str(e)}

    before_slugs_sizes = [(e["slug"], e["size"]) for e in entries]

    if not changes:
        return {
            "path": path,
            "status": "noop",
            "before": [(e["slug"], e["name"]) for e in entries],
            "after": [(e["slug"], e["name"]) for e in entries],
            "changes": [],
            "slug_size_before": before_slugs_sizes,
            "slug_size_after": before_slugs_sizes,
        }

    new_text = text[:block_start] + new_block_text + text[block_end:]
    new_bytes = new_text.encode("utf-8")

    # Re-parse the new block to prove slug/size are untouched and report after-names.
    new_entries = parse_entries(new_block_text)
    after_slugs_sizes = [(e["slug"], e["size"]) for e in new_entries]
    if after_slugs_sizes != before_slugs_sizes:
        raise AssertionError(
            f"{path}: slug/size changed during rename — refusing to write. "
            f"before={before_slugs_sizes} after={after_slugs_sizes}"
        )

    report = {
        "path": path,
        "status": "changed",
        "before": [(e["slug"], e["name"]) for e in entries],
        "after": [(e["slug"], e["name"]) for e in new_entries],
        "changes": changes,
        "slug_size_before": before_slugs_sizes,
        "slug_size_after": after_slugs_sizes,
    }

    if apply:
        with open(path, "wb") as f:
            f.write(new_bytes)

    return report


def print_report(report: dict) -> None:
    path = os.path.relpath(report["path"], REPO_ROOT)
    status = report["status"]
    if status == "skipped":
        print(f"[SKIP]    {path} — {report['reason']}")
    elif status == "error":
        print(f"[ERROR]   {path} — {report['reason']}")
    elif status == "noop":
        names = ", ".join(f"{s}={n}" for s, n in report["after"])
        print(f"[NO-OP]   {path} — already conformant ({names})")
    elif status == "changed":
        print(f"[CHANGE]  {path}")
        for slug, old, new in report["changes"]:
            print(f'          slug {slug}: "{old}" -> "{new}"')


def has_numeric_names(report: dict) -> bool:
    if report["status"] not in ("noop", "changed"):
        return False
    names = [n for _, n in report["after"]] if report["status"] == "changed" else [n for _, n in report["before"]]
    return any(re.fullmatch(r"\d+", n) for n in names)


def run_self_test(break_it: bool = False) -> bool:
    """Build a temp fixture, run the rename, assert names changed and
    slug/size did not. If break_it, sabotage the rename so the assertion
    should FAIL — used to prove the self-test is not vacuous.
    """
    fixture = {
        "settings": {
            "spacing": {
                "spacingSizes": [
                    {"slug": "20", "size": "0.5rem", "name": "2"},
                    {"slug": "30", "size": "0.75rem", "name": "3"},
                    {"slug": "40", "size": "1rem", "name": "4"},
                    {"slug": "50", "size": "1.5rem", "name": "5"},
                    {"slug": "60", "size": "2rem", "name": "6"},
                    {"slug": "70", "size": "3rem", "name": "7"},
                    {"slug": "80", "size": "4rem", "name": "8"},
                    {"slug": "90", "size": "5.5rem", "name": "9"},
                ]
            }
        }
    }
    text = json.dumps(fixture, indent=2)
    # Simulate the repo's CRLF convention.
    text = text.replace("\n", "\r\n")

    tmp_dir = tempfile.mkdtemp(prefix="fix-spacing-selftest-")
    tmp_path = os.path.join(tmp_dir, "theme-snapshot.json")
    with open(tmp_path, "wb") as f:
        f.write(text.encode("utf-8"))

    ladder = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]

    if break_it:
        # Sabotage: force build_renamed_block to report "no changes" by
        # pre-seeding the fixture's names to already equal the target ladder,
        # so a real rename never happens — a broken rename that silently
        # does nothing.
        sabotaged = dict(fixture)
        for entry, name in zip(sabotaged["settings"]["spacing"]["spacingSizes"], ladder):
            entry["name"] = name
        sab_text = json.dumps(sabotaged, indent=2).replace("\n", "\r\n")
        with open(tmp_path, "wb") as f:
            f.write(sab_text.encode("utf-8"))

    report = process_file(tmp_path, ladder, apply=True)

    ok = True
    reasons = []

    if report["status"] != "changed":
        ok = False
        reasons.append(f"expected status 'changed', got {report['status']!r}")
    else:
        after_names = [n for _, n in report["after"]]
        if after_names != ladder:
            ok = False
            reasons.append(f"names after rename {after_names} != expected ladder {ladder}")
        if report["slug_size_before"] != report["slug_size_after"]:
            ok = False
            reasons.append(
                f"slug/size changed! before={report['slug_size_before']} after={report['slug_size_after']}"
            )

    # Read the file back from disk independently to prove the write landed,
    # not just the in-memory report. newline="" preserves raw CRLF instead of
    # Python's universal-newlines translation silently hiding a regression.
    with open(tmp_path, "r", encoding="utf-8", newline="") as f:
        disk_text = f.read()
    disk_data = json.loads(disk_text)
    disk_names = [e["name"] for e in disk_data["settings"]["spacing"]["spacingSizes"]]
    disk_slugs_sizes = [(e["slug"], e["size"]) for e in disk_data["settings"]["spacing"]["spacingSizes"]]
    expected_slugs_sizes = [
        (e["slug"], e["size"]) for e in fixture["settings"]["spacing"]["spacingSizes"]
    ]
    if disk_names != ladder:
        ok = False
        reasons.append(f"on-disk names {disk_names} != expected ladder {ladder}")
    if disk_slugs_sizes != expected_slugs_sizes:
        ok = False
        reasons.append(
            f"on-disk slug/size {disk_slugs_sizes} != original {expected_slugs_sizes}"
        )
    # Preserve CRLF check
    if "\r\n" not in disk_text:
        ok = False
        reasons.append("CRLF line endings were not preserved on disk")

    label = "SABOTAGED RUN (expected to FAIL)" if break_it else "NORMAL RUN (expected to PASS)"
    print(f"--- self-test: {label} ---")
    print(f"status: {report['status']}")
    print(f"before names: {[n for _, n in report['before']]}")
    print(f"after names (in-memory): {[n for _, n in report['after']] if report['status'] == 'changed' else report['before']}")
    print(f"after names (re-read from disk): {disk_names}")
    print(f"slug/size before: {report['slug_size_before']}")
    print(f"slug/size after (disk): {disk_slugs_sizes}")
    if ok:
        print("RESULT: PASS")
    else:
        print("RESULT: FAIL")
        for r in reasons:
            print(f"  - {r}")

    try:
        os.remove(tmp_path)
        os.rmdir(tmp_dir)
    except OSError:
        pass

    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write changes (default is dry-run)")
    parser.add_argument("--check", action="store_true", help="exit 1 if any snapshot still has numeric spacing names")
    parser.add_argument("--self-test", action="store_true", help="run the negative-control self-test and exit")
    args = parser.parse_args()

    if args.self_test:
        print("Running self-test: normal run must PASS, sabotaged run must FAIL.\n")
        normal_ok = run_self_test(break_it=False)
        print()
        sabotaged_ok = run_self_test(break_it=True)
        print()
        if normal_ok and not sabotaged_ok:
            print("SELF-TEST OVERALL: PASS (normal rename works; sabotaged rename is correctly caught as broken)")
            return 0
        print("SELF-TEST OVERALL: FAIL")
        if not normal_ok:
            print("  - normal run did not pass (rename is broken)")
        if sabotaged_ok:
            print("  - sabotaged run passed too (self-test cannot detect a broken rename — vacuous)")
        return 1

    ladder = load_framework_ladder()
    paths = sorted(glob.glob(SITES_GLOB))

    reports = []
    for path in paths:
        report = process_file(path, ladder, apply=args.apply)
        reports.append(report)
        print_report(report)

    if args.check:
        numeric_found = [r for r in reports if has_numeric_names(r)]
        if numeric_found:
            print(f"\n--check: FAIL — {len(numeric_found)} file(s) still have numeric spacing names")
            return 1
        print("\n--check: PASS — no numeric spacing names remain")
        return 0

    errors = [r for r in reports if r["status"] == "error"]
    if errors:
        return 1

    if not args.apply:
        changed = [r for r in reports if r["status"] == "changed"]
        if changed:
            print(f"\nDry run — {len(changed)} file(s) would change. Re-run with --apply to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
