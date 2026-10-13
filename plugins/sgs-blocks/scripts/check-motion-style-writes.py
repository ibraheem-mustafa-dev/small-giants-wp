#!/usr/bin/env python3
"""check-motion-style-writes.py - front-end motion scripts write custom properties only (Spec 38A FR-38A-47).

SCOPE: every .js file under `plugins/sgs-blocks/assets/js` and `plugins/sgs-blocks/src/shared/effects`. Block `view.js`
files are outside FR-38A-47's named scope and are not scanned. A file that imports `gsap`, `gsap/...` or `@sgs/gsap...`
is Tier G and exempt by file: its tweens write inline transforms on their own scope.
THE PROPERTIES: the channel properties the stylesheet composes (every `x-sgs-channels` entry of
`plugins/sgs-blocks/schemas/motion.schema.json` that is not a `::before`/`::after`/layers slot) plus the FR-38A-47 list
(transform, translate, rotate, scale, opacity, filter). A script that writes one of these inline overwrites the
contributions the stylesheet multiplies or adds.
A WRITE (comments are stripped first):
  el.style.transform = ...            el.style['opacity'] = ...         el.style.setProperty('filter', ...)
  Object.assign(el.style, ...)        el.style.cssText = ...            el.setAttribute('style', ...)
ALLOWED: `style.setProperty('--x', ...)`, `style.removeProperty('--x')`, and reads. A `setProperty` whose first
argument is not a string literal is not judged (it cannot be resolved without running the script).

EXCEPTIONS live in plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json (gate "motion-style-writes"; pattern is
the file path relative to plugins/sgs-blocks, for example "assets/js/example.js"). An entry that matches no hit is an
error, and so is one whose delete_in_unit has landed.

--self-test plants, in a temporary tree, `el.style.transform = 'x'`, `el.style.setProperty('opacity','0')`,
`Object.assign(el.style, ...)` and `el.style.cssText = ...` (all caught), a `setProperty('--sgs-tilt-x', ...)` write
(passes) and a Tier G file with a transform write (exempt). It exits 0 only when every plant behaves.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-style-writes.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import motion_gate_allowlist as allowlist  # noqa: E402

REPO = SCRIPTS.parents[2]
PLUGIN = REPO / "plugins" / "sgs-blocks"
SCHEMA = PLUGIN / "schemas" / "motion.schema.json"
SCAN_DIRS = ("assets/js", "src/shared/effects")
GATE = "motion-style-writes"
FR_PROPERTIES = ("transform", "translate", "rotate", "scale", "opacity", "filter")
SLOT_COMPOSITIONS = ("slot", "layers")
TIER_G_IMPORT = re.compile(r"""(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['"](?:gsap(?:/[^'"]*)?|@sgs/gsap[^'"]*)['"]""")
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT = re.compile(r"(?m)(^|[\s;{}(),])//[^\n]*")


def camel(prop: str) -> str:
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), prop)


def forbidden_properties(schema_path: Path) -> list[str]:
    props = set(FR_PROPERTIES)
    if schema_path.is_file():
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        props |= {c["channel"] for c in schema.get("x-sgs-channels") or []
                  if c.get("composition") not in SLOT_COMPOSITIONS and not c["channel"].startswith("::")}
    return sorted(props)


def strip_comments(source: str) -> str:
    """Blank comments but keep line numbers."""
    def blank(match: re.Match) -> str:
        return re.sub(r"[^\n]", " ", match.group(0))

    source = BLOCK_COMMENT.sub(blank, source)
    return LINE_COMMENT.sub(lambda m: m.group(1) + " " * (len(m.group(0)) - len(m.group(1))), source)


def build_patterns(props: list[str]) -> list[tuple[str, re.Pattern]]:
    camels = {camel(p) for p in props}
    camels |= {"webkit" + c[:1].upper() + c[1:] for c in camels}
    names = "|".join(re.escape(n) for n in sorted(camels, key=len, reverse=True))
    kebab = "|".join(re.escape(p) for p in sorted(props, key=len, reverse=True))
    assign = r"\s*(?:[-+*/|&]?=)(?!=)"
    return [
        ("direct assignment", re.compile(rf"\.style\.(?:{names}){assign}")),
        ("bracket assignment", re.compile(rf"""\.style\[\s*['"](?:{names}|{kebab})['"]\s*\]{assign}""")),
        ("setProperty", re.compile(rf"""\.style\.setProperty\(\s*['"](?:-webkit-)?(?:{kebab})['"]""")),
        ("Object.assign onto style", re.compile(r"Object\.assign\(\s*[\w.$\[\]]*\.style\s*,")),
        ("cssText", re.compile(r"\.style\.cssText\s*\+?=(?!=)")),
        ("style attribute", re.compile(r"""\.setAttribute\(\s*['"]style['"]""")),
    ]


def is_tier_g(source: str) -> bool:
    return bool(TIER_G_IMPORT.search(strip_comments(source)))


def find_hits(plugin: Path, props: list[str]) -> list[tuple[str, int, str, str]]:
    """(relative path, line, kind, source line) for every write in a non-Tier-G file."""
    patterns = build_patterns(props)
    hits: set[tuple[str, int, str, str]] = set()
    for rel_dir in SCAN_DIRS:
        for path in sorted((plugin / rel_dir).rglob("*.js")):
            source = path.read_text(encoding="utf-8")
            if is_tier_g(source):
                continue
            rel = path.relative_to(plugin).as_posix()
            clean = strip_comments(source)
            lines = source.splitlines()
            for kind, pattern in patterns:
                for match in pattern.finditer(clean):
                    line = clean.count("\n", 0, match.start()) + 1
                    hits.add((rel, line, kind, lines[line - 1].strip()))
    return sorted(hits)


def evaluate(hits: list, allow: list[dict], allow_errors: list[str]) -> tuple[list[str], list[str]]:
    allowed = {e["pattern"] for e in allow}
    errors = [f"allow-list: {e}" for e in allow_errors]
    notes: list[str] = []
    for rel, line, kind, text in hits:
        message = f"{rel}:{line} {kind}: {text}"
        if rel in allowed:
            notes.append(f"allowed {message}")
        else:
            errors.append(message)
    errors += [f"allow-list: pattern {p!r} matches no hit" for p in sorted(allowed - {h[0] for h in hits})]
    return errors, notes


def run_check(plugin: Path, schema: Path) -> int:
    props = forbidden_properties(schema)
    allow, allow_errors = allowlist.load(REPO, GATE)
    hits = find_hits(plugin, props)
    errors, notes = evaluate(hits, allow, allow_errors)
    for note in notes:
        print(f"note: {note}")
    for error in errors:
        print(f"FAIL: {error}")
    scanned = sum(1 for d in SCAN_DIRS for _ in (plugin / d).rglob("*.js"))
    print(f"check-motion-style-writes: {'FAIL' if errors else 'OK'} "
          f"({scanned} files scanned, {len(props)} channel properties, {len(hits)} hit(s))")
    return 1 if errors else 0


PLANTS = [
    ("el.style.transform = 'x'", "assets/js/planted-a.js", "el.style.transform = 'x';\n", True),
    ("el.style.setProperty('opacity','0')", "assets/js/planted-b.js", "el.style.setProperty('opacity', '0');\n", True),
    ("Object.assign(el.style, ...)", "src/shared/effects/planted-c.js", "Object.assign( el.style, { filter: 'none' } );\n", True),
    ("el.style.cssText = ...", "src/shared/effects/planted-d.js", "el.style.cssText = 'opacity:0';\n", True),
    ("el.style['translate'] = ...", "assets/js/planted-e.js", "el.style['translate'] = '1px';\n", True),
    ("setProperty('--sgs-tilt-x', ...)", "assets/js/planted-f.js",
     "el.style.setProperty('--sgs-tilt-x', '1deg');\nel.style.removeProperty('--sgs-tilt-x');\n", False),
    ("a write inside a comment", "assets/js/planted-g.js", "// el.style.transform = 'x';\n/* el.style.opacity = 0 */\n", False),
    ("Tier G file with a write", "src/shared/effects/gsap/planted-h.js",
     "import { gsap } from 'gsap';\nel.style.transform = 'x';\n", False),
]


def self_test(schema: Path) -> int:
    props = forbidden_properties(schema)
    failures = 0
    for label, rel, body, should_catch in PLANTS:
        with tempfile.TemporaryDirectory() as tmp:
            plugin = Path(tmp)
            for directory in SCAN_DIRS:
                (plugin / directory).mkdir(parents=True, exist_ok=True)
            target = plugin / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body, encoding="utf-8")
            caught = any(hit[0] == rel for hit in find_hits(plugin, props))
        ok = caught == should_catch
        failures += 0 if ok else 1
        expected = "caught" if should_catch else "passes"
        print(f"  plant {label}: {'caught' if caught else 'passes'} ({'ok' if ok else 'WRONG, expected ' + expected})")
    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="scan the front-end motion scripts; exit 1 on any inline channel write")
    group.add_argument("--self-test", action="store_true", help="planted writes must be caught; custom-property and Tier G plants must pass")
    parser.add_argument("--schema", type=Path, default=SCHEMA, help="motion.schema.json (default: the plugin's)")
    args = parser.parse_args()
    return self_test(args.schema) if args.self_test else run_check(PLUGIN, args.schema)


if __name__ == "__main__":
    sys.exit(main())
