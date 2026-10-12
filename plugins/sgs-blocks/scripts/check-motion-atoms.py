#!/usr/bin/env python3
"""check-motion-atoms.py - one control kit, one sanitiser per field type (Spec 38A FR-38A-54, FR-38A-56).

Detection is by behaviour. Comments and string contents are removed first (motion_source_scan.py, a hand-written
scanner, so no PHP binary is needed).

(a) RAW CONTROL. A JS file in the motion panel / effect-control layer imports or renders a raw WordPress value
    control (RangeControl, UnitControl, NumberControl, TextControl, SelectControl, ToggleGroupControl,
    CustomSelectControl, ColorPalette, MediaUpload and their sibling value controls). The layer is
      - every file under src/blocks/extensions/motion/, and
      - any other JS file under src/ that reads or writes an `sgsMotion` path (this catches an effect's own control
        file wherever it sits),
    and the exempt implementation layer is every file under src/components/motion/ (the atoms). A raw control is an
    import from an `@wordpress/*` module (or `wp.components` / `wp.blockEditor`) of a banned name; a local atom that
    happens to share a name is not flagged.

(b) BESPOKE SANITISER. In plugins/sgs-blocks/includes/ and src/ (PHP and JS), outside the field-type helper files
      src/components/motion/field-types.js + field-types/**
      includes/motion/class-sgs-motion-field-types.php + includes/motion/field-types/**
    a function (method, closure, arrow function, or top-level code) that touches an `sgsMotion` path, or a variable
    assigned from one in the same function (one level deep, including foreach / for-of loop variables), and on that
    value calls absint, intval, floatval, parseInt, parseFloat, any sanitize_*, preg_match*, preg_replace, a
    regular-expression test / match / replace, min, max, Math.min, Math.max, a clamp* helper, or applies an
    (int) / (float) cast; or assigns such a call into an sgsMotion path. Arithmetic on a value the field-type helper
    returned is not a call on the raw value and passes.

EXCEPTIONS live in plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json (gate "motion-atoms"; pattern is a
path relative to the repo root, or `path::function`), read through motion_gate_allowlist.py, which also fails an
entry whose delete_in_unit has landed.

KNOWN BLIND SPOTS: a value taken from an sgsMotion path through two or more assignments, a helper's return value
passed on, heredocs, JSX text containing an apostrophe next to a brace, regex literals after `)`, namespace-import
aliases other than `import * as X`, and dynamic property access (`wp.components[name]`).

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-atoms.py --check | --self-test
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parent))
import motion_gate_allowlist as allowlist  # noqa: E402
import motion_source_scan as scan  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
PLUGIN_REL = Path("plugins/sgs-blocks")
FIXTURES = Path(__file__).resolve().parent / "tests/fixtures/motion-atoms"
GATE = "motion-atoms"
SKIP_DIRS = {"node_modules", "build", "vendor", ".phpunit.cache"}
EXTENSIONS = {".php": "php", ".js": "js", ".jsx": "js", ".mjs": "js", ".ts": "js", ".tsx": "js"}
PANEL_DIR = "src/blocks/extensions/motion/"
ATOM_DIR = "src/components/motion/"
FIELD_TYPE_FILES = {"src/components/motion/field-types.js", "includes/motion/class-sgs-motion-field-types.php"}
FIELD_TYPE_DIRS = ("src/components/motion/field-types/", "includes/motion/field-types/")
BANNED = {"RangeControl", "UnitControl", "NumberControl", "TextControl", "TextareaControl", "SelectControl",
          "ToggleGroupControl", "ToggleControl", "CustomSelectControl", "RadioControl", "AnglePickerControl",
          "ColorPalette", "ColorPicker", "MediaUpload", "FontSizePicker"}
BANNED_ALT = "|".join(sorted(BANNED))
SANITISER_CALL = re.compile(
    r"(?<![\w$>:])(?:\\?(?:absint|intval|floatval|parseInt|parseFloat|sanitize_\w+|preg_match_all|preg_match|"
    r"preg_replace_callback|preg_replace|min|max|clamp\w*)|Math\s*\.\s*(?:min|max))\s*\(", re.I)
REGEX_METHOD = re.compile(r"\.\s*(?:test|match|matchAll|replace|replaceAll)\s*\(")
CAST = re.compile(r"\(\s*(?:int|integer|float|double)\s*\)")
ASSIGN = re.compile(r"(?<![=!<>+\-*/.])=(?![=>])")
SGS_MOTION = re.compile(r"\bsgsMotion\b")


def is_field_type_file(rel: str) -> bool:
    return rel in FIELD_TYPE_FILES or rel.startswith(FIELD_TYPE_DIRS)


def source_files(plugin: Path) -> list[Path]:
    files = []
    for base in ("includes", "src"):
        root = plugin / base
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*")):
            if path.suffix in EXTENSIONS and path.is_file() and not path.name.endswith(".min.js") \
                    and not SKIP_DIRS & set(path.relative_to(plugin).parts):
                files.append(path)
    return files


def plain(name: str) -> str:
    return name.replace("__experimental", "").replace("__stable", "")


def raw_controls(code: str, skel: str) -> list[tuple[int, str]]:
    """(offset, name) for every banned @wordpress control imported or reached through wp.* in this file."""
    hits: list[tuple[int, str]] = []
    namespaces: set[str] = set()
    import_re = r"import\s+(?:\w+\s*,\s*)?(?:\*\s+as\s+(\w+)|\{([^}]*)\})\s*from\s*['\"]@wordpress/[\w./-]+['\"]"
    for m in re.finditer(import_re, code):
        if m.group(1):
            namespaces.add(m.group(1))
        for part in (m.group(2) or "").split(","):
            name = part.strip().split(" as ")[0].strip()
            if plain(name) in BANNED:
                hits.append((m.start(), name))
    destructure = r"\{([^}]*)\}\s*=\s*(?:window\s*\.\s*)?wp\s*\.\s*(?:components|blockEditor|editor)\b"
    for m in re.finditer(destructure, code):
        for part in m.group(1).split(","):
            name = part.strip().split(":")[0].strip()
            if plain(name) in BANNED:
                hits.append((m.start(), name))
    for m in re.finditer(rf"\bwp\s*\.\s*(?:components|blockEditor|editor)\s*\.\s*(?:__experimental|__stable)?({BANNED_ALT})\b", skel):
        hits.append((m.start(), m.group(1)))
    for alias in namespaces:
        for m in re.finditer(rf"\b{re.escape(alias)}\s*\.\s*(?:__experimental|__stable)?({BANNED_ALT})\b", skel):
            hits.append((m.start(), m.group(1)))
    return hits


def tainted_names(body: str, lang: str) -> set[str]:
    """Names assigned directly from an sgsMotion expression inside this scope (one level deep)."""
    names: set[str] = set()
    if lang == "php":
        for m in re.finditer(r"(\$\w+)\s*(?:\[[^\]]*\]\s*)*=(?![=>])([^;]*);", body):
            if SGS_MOTION.search(m.group(2)):
                names.add(m.group(1))
        for m in re.finditer(r"foreach\s*\(([^)]*?)\bas\s+([^)]*)\)", body):
            if SGS_MOTION.search(m.group(1)):
                names.update(re.findall(r"\$\w+", m.group(2)))
    else:
        for m in re.finditer(r"\b(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[\w$]+)\s*=(?![=>])([^;]*)", body):
            if SGS_MOTION.search(m.group(2)):
                names.update(re.findall(r"[A-Za-z_$][\w$]*", m.group(1)))
        for m in re.finditer(r"\bfor\s*\(\s*(?:const|let|var)\s+(\{[^}]*\}|[\w$]+)\s+(?:of|in)\s+([^)]*)\)", body):
            if SGS_MOTION.search(m.group(2)):
                names.update(re.findall(r"[A-Za-z_$][\w$]*", m.group(1)))
    return names


def mentions(text: str, names: set[str], lang: str) -> bool:
    if SGS_MOTION.search(text):
        return True
    for name in names:
        before = "" if lang == "php" else r"(?<![\w$.])"
        if re.search(before + re.escape(name) + r"(?![\w$])", text):
            return True
    return False


def bespoke_calls(code: str, skel: str, start: int, end: int, lang: str) -> list[int]:
    """Offsets of sanitising calls in [start, end) that act on, or write into, an sgsMotion value."""
    names = tainted_names(code[start:end], lang)
    if not names and not SGS_MOTION.search(code[start:end]):
        return []
    hits: list[int] = []
    calls = [(m.start(), m.end() - 1, False) for m in SANITISER_CALL.finditer(skel, start, end)]
    calls += [(m.start(), m.end() - 1, True) for m in REGEX_METHOD.finditer(skel, start, end)]
    for at, paren, is_method in calls:
        argument = code[paren:scan.match_forward(skel, paren) + 1]
        statement = code[max(start, code.rfind(";", start, at) + 1, code.rfind("{", start, at) + 1):at]
        if is_method:
            owner = re.search(r"([\w$\].\[)'\"-]+)\s*$", code[max(start, at - 120):at])
            statement_owner = owner.group(1) if owner else ""
            if mentions(statement_owner, names, lang):
                hits.append(at)
                continue
        if mentions(argument, names, lang) or (ASSIGN.search(statement) and mentions(statement, names, lang)):
            hits.append(at)
    for m in CAST.finditer(skel, start, end):
        if mentions(code[m.end():m.end() + 160].split(";")[0], names, lang):
            hits.append(m.start())
    return hits


def blank_spans(text: str, spans: list[tuple[int, int, str]]) -> str:
    chars = list(text)
    for start, end, _ in spans:
        for k in range(start, min(end + 1, len(chars))):
            if chars[k] != "\n":
                chars[k] = " "
    return "".join(chars)


def file_findings(rel: str, text: str, lang: str, allow: set[str]) -> list[str]:
    code, skel = scan.strip(text, lang)
    touches = bool(SGS_MOTION.search(code))
    findings: list[str] = []
    if lang == "js" and not rel.startswith(ATOM_DIR) and (rel.startswith(PANEL_DIR) or touches) and rel not in allow:
        for at, name in raw_controls(code, skel):
            findings.append(f"{rel}:{scan.line_of(text, at)}: raw control {name} in the motion panel layer; "
                            "use the motion atom (src/components/motion/)")
    if not touches or is_field_type_file(rel):
        return findings
    spans = scan.scopes(skel, lang)
    seen: dict[int, str] = {}
    for start, end, name in sorted(spans, key=lambda s: s[1] - s[0]):
        for at in bespoke_calls(code, skel, start, end, lang):
            seen.setdefault(at, name)
    top_code, top_skel = blank_spans(code, spans), blank_spans(skel, spans)
    for at in bespoke_calls(top_code, top_skel, 0, len(code), lang):
        seen.setdefault(at, "{file}")
    for at, name in sorted(seen.items()):
        if f"{rel}::{name}" in allow or rel in allow:
            continue
        findings.append(f"{rel}:{scan.line_of(text, at)}: {name}() sanitises, clamps or regex-matches an sgsMotion "
                        "value; only the field-type helpers may")
    return findings


def check_tree(plugin: Path, allow: set[str]) -> list[str]:
    findings: list[str] = []
    for path in source_files(plugin):
        text = path.read_text(encoding="utf-8", errors="replace")
        findings += file_findings(path.relative_to(plugin).as_posix(), text, EXTENSIONS[path.suffix], allow)
    return findings


def run_check() -> int:
    live, errors = allowlist.load(REPO, GATE)
    prefix = PLUGIN_REL.as_posix() + "/"
    allow = {entry["pattern"].removeprefix(prefix) for entry in live}
    findings = check_tree(REPO / PLUGIN_REL, allow)
    for line in [f"allow-list: {e}" for e in errors] + findings:
        print(f"FAIL {line}")
    bad = bool(errors or findings)
    print(f"check-motion-atoms: {'FAIL' if bad else 'OK'} "
          f"({len(source_files(REPO / PLUGIN_REL))} files scanned, {len(live)} allow-list entries)")
    return 1 if bad else 0


PLANTS = (("neg-raw-range-panel", True), ("neg-sanitise-duration", True), ("neg-one-level-absint", True),
          ("neg-unrelated-name-clamp", True), ("pos-atoms-only-panel", False))


def self_test() -> int:
    failures = 0
    for name, should_flag in PLANTS:
        folder = FIXTURES / name
        findings = check_tree(folder, set()) if folder.is_dir() else []
        ok = bool(findings) == should_flag
        failures += 0 if ok else 1
        print(f"self-test: {name}: {'caught' if findings else 'clean'} ({'expected' if ok else 'WRONG'})")
        for line in findings[:2]:
            print(f"    {line}")
    rule_errors = allowlist.load(FIXTURES / "landed-rule", GATE)[1]
    landed_ok = len(rule_errors) == 1 and "has landed" in rule_errors[0]
    print(f"self-test: allow-list entry for a landed unit: {'rejected (expected)' if landed_ok else 'NOT rejected (WRONG)'}")
    failures += 0 if landed_ok else 1
    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="scan the tree; exit 1 on any finding")
    group.add_argument("--self-test", action="store_true", help="the four plants must fail, the positive must pass")
    args = parser.parse_args()
    return self_test() if args.self_test else run_check()


if __name__ == "__main__":
    sys.exit(main())
