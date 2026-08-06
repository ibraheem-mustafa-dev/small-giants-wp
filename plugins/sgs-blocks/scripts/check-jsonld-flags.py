#!/usr/bin/env python3
r"""
check-jsonld-flags.py — guard the ONE json_encode flag combination that is unsafe.

THE DEFECT (parking P-JSONLD-HEX-FLAG-GUARD)
--------------------------------------------
`JSON_UNESCAPED_SLASHES` **without** `JSON_HEX_TAG`.

PHP escapes `/` as `\/` by default, which means a literal `</script>` inside an
encoded value comes out as `<\/script>` and cannot close an inline
`<script type="application/ld+json">` block. `JSON_UNESCAPED_SLASHES` turns that
default off — for good reasons (readable URLs, no double-encoding) — and in doing
so removes the *only* thing standing between an attacker-controlled string and a
script-tag breakout. `JSON_HEX_TAG` restores the protection properly by encoding
`<` and `>` as `\u003C` / `\u003E`.

WHY THE NAIVE GATE IS BADLY WRONG
---------------------------------
"every json_encode must pass JSON_HEX_TAG" raises ~193 false positives in this
tree, because ZERO FLAGS IS INCIDENTALLY SAFE: with no flags at all, PHP's default
slash-escaping already neutralises `</script>`. A gate that flags those calls
would be noise, and a noisy gate gets switched off. The unsafe combination is
specifically SLASHES-without-HEX_TAG, and nothing else.

THE RULE, EXACTLY
-----------------
FAIL iff a `json_encode` / `wp_json_encode` call's flag expression
    contains `JSON_UNESCAPED_SLASHES`  AND  does not contain `JSON_HEX_TAG`.
Everything else passes:
    no flags                      -> pass (PHP's default slash-escaping protects)
    JSON_HEX_TAG|JSON_HEX_AMP     -> pass (no slash-unescaping to undo)
    UNESCAPED_SLASHES             -> FAIL (the real defect)
    UNESCAPED_SLASHES|HEX_TAG     -> pass (the correct pairing)

CONSTANT INDIRECTION
--------------------
The shared encoder (`includes/class-sgs-schema.php`) passes `self::JSON_FLAGS`,
not a literal flag expression. A textual check would see no `JSON_HEX_TAG` there
and either raise a false positive or need a hardcoded allowlist naming the shared
encoder — and a hardcoded allowlist is exactly what R-31-1 forbids. So this gate
resolves ONE level of constant indirection: any `CONST`, `self::CONST` or
`Class::CONST` in the flag expression is substituted with that constant's
definition (harvested from the tree) before the rule is applied. No allowlist, no
special-casing of any file.

Exit codes: 0 when no call matches the unsafe combination, 1 otherwise.

Usage:
    python check-jsonld-flags.py              # report (exit 0)
    python check-jsonld-flags.py --check      # gate  (exit 1 on any violation)
    python check-jsonld-flags.py --self-test  # five labelled fixtures, both directions
"""
from __future__ import annotations

import re
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_HERE = Path(__file__).resolve().parent
_PLUGIN_ROOT = _HERE.parent                      # plugins/sgs-blocks/
_SCAN_DIRS = ("src", "includes")

_CALL_RE = re.compile(r"\b(?:wp_)?json_encode\s*\(")

# `const NAME = <expr>;` (class or namespace const) and `define( 'NAME', <expr> );`
_CONST_DEF_RE = re.compile(
    r"\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);",
)
_DEFINE_RE = re.compile(
    r"\bdefine\s*\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\s*,\s*([^;]+?)\s*\)\s*;",
)

# A constant reference in a flag expression: `FOO`, `self::FOO`, `Sgs_Schema::FOO`.
_CONST_REF_RE = re.compile(
    r"(?:(?:\\?[A-Za-z_][A-Za-z0-9_\\]*|self|static|parent)\s*::\s*)?"
    r"\b([A-Z_][A-Z0-9_]{2,})\b"
)

SLASHES = "JSON_UNESCAPED_SLASHES"
HEX_TAG = "JSON_HEX_TAG"


def _strip_noise(text: str) -> str:
    """Blank out string literals and comments, preserving length and newlines.

    Length preservation matters: offsets computed on the blanked text index
    correctly back into the original source for line numbers and snippets.
    """
    out = list(text)
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if ch in ("'", '"'):
            quote = ch
            j = i + 1
            while j < n:
                if text[j] == "\\":
                    j += 2
                    continue
                if text[j] == quote:
                    break
                j += 1
            for k in range(i, min(j + 1, n)):
                if text[k] != "\n":
                    out[k] = " "
            i = j + 1
            continue
        if text.startswith("//", i) or ch == "#":
            j = text.find("\n", i)
            j = n if j == -1 else j
            for k in range(i, j):
                out[k] = " "
            i = j
            continue
        if text.startswith("/*", i):
            j = text.find("*/", i + 2)
            j = n if j == -1 else j + 2
            for k in range(i, j):
                if text[k] != "\n":
                    out[k] = " "
            i = j
            continue
        i += 1
    return "".join(out)


def _match_call(blank: str, open_paren: int) -> int | None:
    """Bracket-match forward from `open_paren` to its closing paren index.

    Operates on the noise-blanked text so a paren inside a string or comment can
    never unbalance the count. Returns None on an unterminated call.
    """
    depth = 0
    for i in range(open_paren, len(blank)):
        c = blank[i]
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
            if depth == 0:
                return i
    return None


def _split_top_level(blank_args: str, raw_args: str) -> list[str]:
    """Split the raw argument text on commas that are at nesting depth zero."""
    parts, depth, start = [], 0, 0
    for i, c in enumerate(blank_args):
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        elif c == "," and depth == 0:
            parts.append(raw_args[start:i])
            start = i + 1
    parts.append(raw_args[start:])
    return parts


def harvest_constants(files: list[Path]) -> dict[str, str]:
    """Map CONST_NAME -> its definition text, across every scanned file."""
    consts: dict[str, str] = {}
    for path in files:
        try:
            blanked = _strip_noise(path.read_text(encoding="utf-8", errors="replace"))
        except OSError:
            continue
        raw = path.read_text(encoding="utf-8", errors="replace")
        for m in _CONST_DEF_RE.finditer(blanked):
            consts[m.group(1)] = raw[m.start(2):m.end(2)]
        for m in _DEFINE_RE.finditer(blanked):
            consts[m.group(1)] = raw[m.start(2):m.end(2)]
    return consts


def resolve_flags(expr: str, consts: dict[str, str]) -> tuple[str, list[str]]:
    """Substitute ONE level of constant indirection. Returns (resolved, names_used)."""
    used: list[str] = []

    def sub(m: re.Match[str]) -> str:
        name = m.group(1)
        # Harvested constants win over the JSON_ prefix test, and MUST be checked
        # first: the shared encoder's own constant is literally named JSON_FLAGS,
        # so a `name.startswith("JSON_")` skip placed ahead of this would leave
        # `self::JSON_FLAGS` unresolved. It would then contain no
        # JSON_UNESCAPED_SLASHES, read as safe, and the gate would be blind to the
        # shared encoder in BOTH directions — silently green forever.
        if name in consts:
            used.append(name)
            return " " + consts[name] + " "
        if name.startswith("JSON_"):
            return m.group(0)              # a genuine PHP flag constant
        return m.group(0)

    return _CONST_REF_RE.sub(sub, expr), used


def scan_text(text: str, consts: dict[str, str], label: str) -> list[dict]:
    """Return one finding dict per UNSAFE json_encode call in `text`."""
    blank = _strip_noise(text)
    findings: list[dict] = []
    for m in _CALL_RE.finditer(blank):
        open_paren = blank.index("(", m.end() - 1)
        close = _match_call(blank, open_paren)
        if close is None:
            continue
        raw_args = text[open_paren + 1:close]
        blank_args = blank[open_paren + 1:close]
        parts = _split_top_level(blank_args, raw_args)
        if len(parts) < 2:
            continue                       # no flags argument at all -> safe by default
        flag_expr = ",".join(parts[1:])
        resolved, used = resolve_flags(flag_expr, consts)
        if SLASHES in resolved and HEX_TAG not in resolved:
            findings.append({
                "file": label,
                "line": text.count("\n", 0, m.start()) + 1,
                "expr": " ".join(flag_expr.split()),
                "resolved": " ".join(resolved.split()),
                "consts_used": used,
            })
    return findings


def collect_files() -> list[Path]:
    files: list[Path] = []
    for d in _SCAN_DIRS:
        root = _PLUGIN_ROOT / d
        if root.is_dir():
            files.extend(sorted(root.rglob("*.php")))
    root_php = _PLUGIN_ROOT / "sgs-blocks.php"
    if root_php.exists():
        files.append(root_php)
    return files


def run() -> tuple[int, list[str]]:
    out: list[str] = []
    files = collect_files()
    consts = harvest_constants(files)

    findings: list[dict] = []
    calls = 0
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        calls += len(_CALL_RE.findall(_strip_noise(text)))
        rel = path.relative_to(_PLUGIN_ROOT).as_posix()
        findings.extend(scan_text(text, consts, rel))

    out.append(
        f"[check-jsonld-flags] scanned {len(files)} PHP file(s), {calls} json_encode call(s), "
        f"{len(consts)} constant definition(s) harvested for indirection resolution."
    )

    if not findings:
        out.append(
            "[check-jsonld-flags] OK — no call passes JSON_UNESCAPED_SLASHES without "
            "JSON_HEX_TAG. (Calls with no flags at all are safe: PHP's default "
            "slash-escaping already neutralises a literal </script>.)"
        )
        return 0, out

    out.append("")
    out.append("=" * 74)
    out.append("check-jsonld-flags — FAIL: script-breakout risk in inline JSON")
    out.append("=" * 74)
    out.append("")
    out.append(
        "Each call below disables PHP's default slash-escaping with "
        "JSON_UNESCAPED_SLASHES but does NOT restore the protection with "
        "JSON_HEX_TAG. A literal </script> inside any encoded value can close the "
        "inline script tag."
    )
    out.append("")
    for f in findings:
        out.append(f"  {f['file']}:{f['line']}")
        out.append(f"      flags: {f['expr']}")
        if f["consts_used"]:
            out.append(f"      resolved via {', '.join(f['consts_used'])}: {f['resolved']}")
    out.append("")
    out.append("FIX: add JSON_HEX_TAG to the flag expression (JSON_HEX_AMP | JSON_HEX_APOS |")
    out.append("     JSON_HEX_QUOT alongside it is the house set — see the shared encoder")
    out.append("     includes/class-sgs-schema.php JSON_FLAGS), or drop")
    out.append("     JSON_UNESCAPED_SLASHES if readable URLs are not needed.")
    out.append("")
    out.append(f"[check-jsonld-flags] FAIL — {len(findings)} unsafe call(s).")
    return 1, out


# --------------------------------------------------------------------------- self-test

_FIXTURES = [
    ("no flags at all (incidentally safe — PHP escapes the slash)",
     "<?php $x = wp_json_encode( $data );", 0),
    ("JSON_HEX_TAG | JSON_HEX_AMP (safe — no slash-unescaping to undo)",
     "<?php $x = wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP );", 0),
    ("JSON_UNESCAPED_SLASHES alone (THE DEFECT — negative control)",
     "<?php $x = wp_json_encode( $data, JSON_UNESCAPED_SLASHES );", 1),
    ("JSON_UNESCAPED_SLASHES | JSON_HEX_TAG (safe — the correct pairing)",
     "<?php $x = json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG );", 0),
    ("self::JSON_FLAGS resolving to the real shared constant (safe via indirection)",
     "<?php class S { private const JSON_FLAGS = \\JSON_HEX_TAG | \\JSON_HEX_AMP "
     "| \\JSON_UNESCAPED_SLASHES | \\JSON_UNESCAPED_UNICODE;\n"
     "  public static function e( $d ) { return \\wp_json_encode( $d, self::JSON_FLAGS ); } }",
     0),
]


def self_test() -> int:
    print("check-jsonld-flags --self-test")
    print("=" * 74)
    print("Five labelled fixtures. The gate must FAIL exactly the one real defect and")
    print("PASS the four safe shapes — a gate that passed everything, including by")
    print("failing to parse, would be indistinguishable from no gate at all.\n")
    failures = 0
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for i, (label, source, expected) in enumerate(_FIXTURES, 1):
            path = tmp / f"fixture_{i}.php"
            path.write_text(source, encoding="utf-8")
            consts = harvest_constants([path])
            found = scan_text(source, consts, path.name)
            ok = len(found) == expected
            verdict = "PASS" if ok else "BROKEN"
            want = "FAIL" if expected else "pass"
            print(f"  [{verdict:6}] fixture {i}: {label}")
            print(f"           expected the gate to {want}; got {len(found)} finding(s)")
            if not ok:
                failures += 1
                for f in found:
                    print(f"           unexpected: {f['expr']}")

        # Vacuity guard: fixture 5 must be passing because the indirection actually
        # RESOLVED, not because the parser silently gave up on `self::JSON_FLAGS`.
        # This guard is not theoretical — an earlier revision skipped every name
        # starting with "JSON_", which silently swallowed the shared encoder's own
        # JSON_FLAGS constant and made fixture 5 pass for entirely the wrong reason.
        # So assert on the RESOLVED EXPRESSION, not merely on what was harvested.
        path = tmp / "fixture_5.php"
        consts = harvest_constants([path])
        resolved, used = resolve_flags("self::JSON_FLAGS", consts)
        resolved_ok = (
            "JSON_FLAGS" in used
            and SLASHES in resolved
            and HEX_TAG in resolved
        )
        print(f"  [{'PASS' if resolved_ok else 'BROKEN':6}] fixture 5 vacuity guard: "
              f"`self::JSON_FLAGS` resolved via {used or 'NOTHING'} to an expression "
              f"containing SLASHES={SLASHES in resolved} HEX_TAG={HEX_TAG in resolved}")
        if not resolved_ok:
            failures += 1

        # And prove the resolver is load-bearing: a constant WITHOUT HEX_TAG must fail.
        bad = tmp / "fixture_6.php"
        bad.write_text(
            "<?php class B { private const MY_FLAGS = \\JSON_UNESCAPED_SLASHES "
            "| \\JSON_UNESCAPED_UNICODE;\n"
            "  public static function e( $d ) { return \\wp_json_encode( $d, self::MY_FLAGS ); } }",
            encoding="utf-8",
        )
        src = bad.read_text(encoding="utf-8")
        found = scan_text(src, harvest_constants([bad]), bad.name)
        ok = len(found) == 1
        print(f"  [{'PASS' if ok else 'BROKEN':6}] resolver negative control: a constant that "
              f"resolves to SLASHES-without-HEX_TAG => {len(found)} finding(s), expected 1")
        if not ok:
            failures += 1

    print()
    print("-" * 74)
    if failures:
        print(f"SELF-TEST FAILED — {failures} fixture(s)/control(s) did not hold.")
        return 1
    print("SELF-TEST PASSED — the gate fails the real defect, passes all four safe "
          "shapes, and its constant-indirection resolver is proven load-bearing in "
          "both directions.")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    rc, out = run()
    print("\n".join(out))
    return rc if "--check" in sys.argv else 0


if __name__ == "__main__":
    sys.exit(main())
