#!/usr/bin/env python3
"""check-shader-sources.py — structural gate for Tier W `*.frag.js` shader sources.

Spec ref: .claude/specs/38-SGS-MOTION-SYSTEM.md §1.2b (D479 "rendering substrate" tier)
+ D555 (Tier W surface-treatment build).

THE DEFECT THIS EXISTS TO CATCH (a real one, this session)
----------------------------------------------------------------------------------------
A shader source is authored as a JS template literal (export const FOO = BACKTICK#version
300 es ... BACKTICK;) so it can be imported like any other module and bundled with no separate
asset-loader step. That shape has one sharp edge: GLSL uses backticks nowhere in its own
grammar, but if one is ever typed inside the template literal by accident (a stray copy-
paste character, an editor auto-pairing a Markdown-style code fence inside a comment) it
silently CLOSES the JS template literal early. Everything after that point stops being
the shader string and becomes bare JS source — which usually still parses (the rest of
the truncated GLSL text happens to tokenize as some combination of identifiers, calls and
operators), so nothing raises.

Two things make this dangerous specifically for THIS project's existing tooling, not
generically:
  1. `node --check <file>` — the obvious "does this JS parse" gate — returns exit 0 on
     any file with a top-level `import`/`export` statement, REGARDLESS of what is inside
     a truncated template literal elsewhere in the file, because `--check` only validates
     syntax, and a truncated-then-reassembled template literal is frequently still
     syntactically valid JS (verified live with a negative control before writing this
     gate: a deliberately backtick-truncated `.frag.js` fixture passed `node --check`
     with exit 0).
  2. A broken shader FAILS OPEN at runtime: `initSurface()` (src/shared/effects/webgl/
     index.js) either fails to compile the mangled GLSL and the WebGL bootstrap silently
     falls back to showing the untreated image (surface-treatment's own `editor_story`/
     `reduced_motion` design — see seed-motion-fx-registry.py's `surface-treatment` row —
     means "no visible treatment" reads as a perfectly normal, unremarkable state to
     every other check in this project's pipeline). So a truncated shader ships, every
     other gate stays green, and nobody knows until a human happens to look at a page
     with the treatment applied and notices nothing changed.

WHAT THIS GATE DOES NOT DO
----------------------------------------------------------------------------------------
This is a STRUCTURAL check, not a GLSL compiler. It never asks whether the shader is
semantically correct GLSL ES 3.00 — no swizzle validation, no type checking, no uniform-
usage analysis. It answers a narrower, cheaper question: "is this file still shaped like
one intact, uninterrupted `#version 300 es` fragment shader wrapped in exactly one JS
template literal, with no stray backtick anywhere inside it" — which is exactly the
failure mode described above, and exactly what `node --check` cannot see. A shader that
passes this gate can still have a genuine semantic bug; a shader that fails this gate is
provably broken in the ONE way this project has actually hit.

NO NEW NPM DEPENDENCY. No GLSL parser, no WebGL context, no headless browser — every
check below is a plain-text/regex structural assertion.

GATE SHAPE (matches check-fx-list-drift.py / check-motion-bundle-budget.py)
----------------------------------------------------------------------------------------
- Default (no flag): observational report, exit 0 regardless of findings.
- --check:     gating mode. Exit 1 on any assertion failure, including a vacuous glob.
- --self-test: proves the gate can fail. Writes broken fixture variants to a SYSTEM TEMP
  directory (never into the repo) and proves each assertion can independently fail,
  plus the anti-vacuity floor (a glob that matches nothing must FAIL, not silently pass).

Run: python plugins/sgs-blocks/scripts/check-shader-sources.py --check
"""
from __future__ import annotations

import argparse
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPT_DIR = Path(__file__).resolve().parent
_PLUGIN_ROOT = _SCRIPT_DIR.parent  # plugins/sgs-blocks
_SHADER_GLOB_ROOT = _PLUGIN_ROOT / "src" / "shared" / "effects"
_SHADER_GLOB_PATTERN = "**/*.frag.js"

# Anti-vacuity floor for the file-discovery glob itself — see the "Anti-vacuity" finding
# type below. There are 3 shaders as of D555 (grain/halftone/duotone); a floor of 1 is
# enough to prove the glob is not silently matching nothing while staying honest about
# the roster being DB/directory-derived, never hardcoded here.
_MIN_SHADER_FILES = 1


@dataclass(frozen=True)
class Finding:
    file: str
    check: str
    detail: str


def _find_shader_files(root: Path) -> list[Path]:
    if not root.is_dir():
        return []
    return sorted(root.glob(_SHADER_GLOB_PATTERN))


_EXPORT_LITERAL_MARKER = re.compile(r"export\s+const\s+\w+\s*=\s*`")


def _find_backtick_positions(text: str) -> list[int]:
    """Every backtick index in `text`, skipping a backslash-escaped ``\\` `` (JS lets a
    template literal contain a literal backtick that way — GLSL never needs to, but the
    scanner should not mistake a deliberately escaped one for the defect this gate
    exists to catch)."""
    positions: list[int] = []
    i = 0
    length = len(text)
    while i < length:
        if text[i] == "`" and not (i > 0 and text[i - 1] == "\\"):
            positions.append(i)
        i += 1
    return positions


def _extract_shader_literal(source: str) -> tuple[str | None, int]:
    """Locate the shader's own `export const X = `-prefixed template literal and
    return `(literal_body_or_None, backtick_count_after_the_opener)`.

    SCOPED deliberately to start searching for backticks only AFTER the
    `export const X = `` `` marker — not the whole file. A `.frag.js` module's leading
    JSDoc block comment routinely uses markdown-style `` `code span` `` backticks in
    prose (verified live in grain.frag.js: "a hash of the UV coordinate (plus
    `uSeed`)"), which are completely legitimate JS comment content and have nothing to
    do with the template literal that follows. Scanning the whole file for "every
    backtick" would count those prose spans as if they were part of the shader string,
    which is exactly wrong — caught by running this gate against the real, INTACT
    shader files before trusting it (they falsely failed on the first version of this
    function; see the fix note in the self-test for the regression this now prevents).

    `backtick_count_after_the_opener` is the number of (unescaped) backticks found from
    immediately after the opening `` ` `` to end of file. An intact file has exactly 1
    (the closing backtick); 0 means the literal never closes; 2+ means either a second,
    unrelated template literal later in the file, or — the specific defect this gate
    exists to catch — a stray backtick INSIDE the shader that closed the literal early.
    """
    marker = _EXPORT_LITERAL_MARKER.search(source)
    if marker is None:
        return None, 0
    content_start = marker.end()
    rest = source[content_start:]
    backtick_positions = _find_backtick_positions(rest)
    if not backtick_positions:
        return None, 0
    # Diagnostic body: up to the FIRST closing backtick found, whether or not that is
    # the "real" intended close — this mirrors what a JS parser itself would treat as
    # the literal's content when a stray backtick truncates it early, which is exactly
    # the failure mode under test.
    body = rest[: backtick_positions[0]]
    return body, len(backtick_positions)


def _check_one_file(path: Path, root: Path) -> list[Finding]:
    try:
        rel = str(path.relative_to(_PLUGIN_ROOT))
    except ValueError:
        rel = str(path)
    findings: list[Finding] = []
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        return [Finding(rel, "read", f"could not read file: {exc}")]

    # 1. Exactly ONE template literal export, found by scoping the search to AFTER the
    #    `export const X = ` marker — never the whole file, which would wrongly count
    #    markdown-style `` `code span` `` backticks inside the file's own leading JSDoc
    #    prose as if they belonged to the shader (see `_extract_shader_literal`'s own
    #    docstring for the real fixture this caught it against). `backtick_count` is
    #    the number of unescaped backticks from right after the opener to EOF: exactly
    #    1 for an intact file (the closing backtick); 0 means it never closes; 2+ means
    #    EITHER a second, unrelated template literal later in the file OR — the actual
    #    defect this gate exists for — a stray backtick INSIDE the shader splitting one
    #    literal into two-or-more fragments. Both 2+ cases are real findings; the
    #    message doesn't try to guess which, because from outside the literal alone
    #    that distinction isn't decidable.
    shader, backtick_count = _extract_shader_literal(text)
    if shader is None:
        findings.append(Finding(
            rel, "single-template-literal",
            "no `export const X = `...`;`-shaped template literal found at all — this "
            "file does not look like a `*.frag.js` shader module, or its opening "
            "template literal never closes.",
        ))
        return findings  # nothing further to check without a literal to inspect
    if backtick_count != 1:
        findings.append(Finding(
            rel, "single-template-literal",
            f"found {backtick_count} backtick(s) after the template literal's opener, "
            "expected exactly 1 (the closing backtick). This is either a second, "
            "unrelated template literal later in the file, or — the specific defect "
            "this gate exists to catch — a stray backtick INSIDE the shader source "
            "that silently truncated the intended template literal early and spilled "
            "the rest of the GLSL text out into bare JS.",
        ))
        # Still worth checking the truncated body's own shape below — that IS the
        # defect under test, and reporting it concretely (not just the count
        # violation above) is more actionable.

    # 2. `#version 300 es` as the VERY FIRST LINE of the extracted GLSL. GLSL ES 3.00
    #    requires the version pragma to be the first thing in the source with nothing
    #    before it (not even a blank line) — the same rule a WebGL compiler itself
    #    enforces, checked here without needing a real WebGL context.
    first_line = shader.split("\n", 1)[0]
    if first_line.strip() != "#version 300 es":
        findings.append(Finding(
            rel, "version-pragma",
            f"first line of the extracted shader is {first_line.strip()!r}, expected "
            "exactly '#version 300 es'. GLSL ES 3.00 requires the version pragma to be "
            "the first token in the source with nothing preceding it.",
        ))

    # 3. `void main` present — every GLSL shader needs an entry point.
    if not re.search(r"\bvoid\s+main\s*\(", shader):
        findings.append(Finding(
            rel, "main-entrypoint",
            "no `void main(...)` entry point found in the extracted shader — a GLSL "
            "fragment shader with no main() will not compile.",
        ))

    # 4. `out vec4` declared — the fragment shader's colour output (GLSL ES 3.00 uses an
    #    explicit `out` variable, not the legacy `gl_FragColor`). The variable's own
    #    name is never asserted (grain.frag.js/halftone.frag.js/duotone.frag.js all use
    #    `fragColour`, but nothing requires that spelling) — only that SOME `out vec4`
    #    declaration exists.
    if not re.search(r"\bout\s+vec4\b", shader):
        findings.append(Finding(
            rel, "fragment-output",
            "no `out vec4 <name>;` declaration found — a GLSL ES 3.00 fragment shader "
            "needs an explicit `out vec4` colour output (the legacy `gl_FragColor` is "
            "not valid in a #version 300 es shader).",
        ))

    # 5. No backtick appears BETWEEN the opening and closing backticks of the template
    #    literal. This sounds tautological given check 1 already asserts
    #    `backtick_count == 1` — the assertion is really "backtick_count > 1 IMPLIES an
    #    internal backtick", which check 1 above already reports on its own. Kept as an
    #    explicit, separately-worded finding (rather than folded silently into check 1)
    #    because it names the EXACT defect from the incident this gate was written for,
    #    so a reader scanning findings sees the specific claim, not just a backtick-
    #    count mismatch that requires re-deriving what it implies. (backtick_count == 0
    #    — an unclosed literal — is a different shape, already handled by the early
    #    return above; this check only fires on the "too many" side.)
    if backtick_count > 1:
        findings.append(Finding(
            rel, "no-internal-backtick",
            "a backtick appears between the opening and closing backticks of the "
            "template literal — this is the exact defect this gate exists to catch: a "
            "stray backtick silently terminates the JS template literal early, and "
            "`node --check` does not catch it (verified with a negative control; see "
            "this script's module docstring).",
        ))

    return findings


def evaluate(root: Path = _SHADER_GLOB_ROOT) -> tuple[list[Finding], list[Path], bool]:
    """Returns (findings, files_checked, vacuous).

    `vacuous` is True when the glob matched fewer than `_MIN_SHADER_FILES` files — a
    gate that silently checks zero files has verified nothing and must fail loudly
    rather than reporting a clean "0 findings" that looks identical to a healthy run.
    """
    files = _find_shader_files(root)
    if len(files) < _MIN_SHADER_FILES:
        return (
            [Finding(
                str(root), "anti-vacuity",
                f"the glob `{_SHADER_GLOB_PATTERN}` under {root} matched {len(files)} "
                f"file(s), expected at least {_MIN_SHADER_FILES}. Either the shader "
                "directory has been moved/renamed, or every shader has genuinely been "
                "removed — either way this gate cannot verify anything and must not "
                "report a silent PASS.",
            )],
            files,
            True,
        )

    findings: list[Finding] = []
    for path in files:
        findings.extend(_check_one_file(path, root))
    return findings, files, False


def _print_report(findings: list[Finding], files: list[Path], vacuous: bool, root: Path) -> None:
    print(f"[check-shader-sources] scanning {root} ({_SHADER_GLOB_PATTERN})")
    if vacuous:
        for finding in findings:
            print(f"  VACUOUS: {finding.detail}")
        return
    print(f"[check-shader-sources] {len(files)} shader module(s) found: "
          f"{', '.join(p.name for p in files)}")
    if not findings:
        print("[check-shader-sources] all structural checks passed.")
        return
    for finding in findings:
        print(f"  FAIL [{finding.check}] {finding.file}: {finding.detail}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Structural gate for Tier W src/shared/effects/**/*.frag.js shader sources "
            "— catches truncation/corruption of the JS template literal a shader is "
            "authored in. NOT a GLSL compiler; see module docstring."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", default=False,
                       help="Gating mode: exit 1 on any structural finding or a vacuous glob.")
    mode.add_argument("--self-test", action="store_true", default=False,
                       help="Prove the gate can fail: broken fixtures in a system temp dir.")
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

    findings, files, vacuous = evaluate()
    _print_report(findings, files, vacuous, _SHADER_GLOB_ROOT)

    if not args.check:
        if vacuous or findings:
            print(f"\n[check-shader-sources] {len(findings)} finding(s) — report mode, "
                  "exit 0. Run with --check to gate.")
        return 0

    if vacuous or findings:
        print(f"\n[check-shader-sources] GATE FAILED — {len(findings)} finding(s) above.")
        return 1
    print("\n[check-shader-sources] GATE PASSED.")
    return 0


# ---------------------------------------------------------------------------
# --self-test
# ---------------------------------------------------------------------------
#
# Every broken fixture is written to a SYSTEM TEMP directory (tempfile.mkdtemp), never
# into the repo — the task brief's own explicit requirement, and the right call anyway:
# a self-test that wrote broken shader fixtures into src/shared/effects/ would itself be
# exactly the kind of corrupted-shader risk this gate exists to catch.

_GOOD_FIXTURE = """export const SELFTEST_FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColour;

uniform sampler2D u_image;

void main() {
\tfragColour = texture( u_image, v_uv );
}
`;
"""


def _self_test() -> int:
    failures: list[str] = []
    tmp_root = Path(tempfile.mkdtemp(prefix="check-shader-sources-selftest-"))
    try:
        good_dir = tmp_root / "good"
        good_dir.mkdir()
        good_path = good_dir / "selftest.frag.js"
        good_path.write_text(_GOOD_FIXTURE, encoding="utf-8")

        # --- Case 0: a vacuous root (no matching files) must FAIL, not pass silently.
        empty_dir = tmp_root / "empty"
        empty_dir.mkdir()
        findings, files, vacuous = evaluate(empty_dir)
        if not vacuous:
            failures.append("anti-vacuity")
            print("[check-shader-sources --self-test] FAIL — an empty directory (0 "
                  "matching *.frag.js files) was NOT flagged vacuous. A moved/renamed "
                  "shader directory would read green forever.")
        else:
            print("[check-shader-sources --self-test] anti-vacuity case: correctly "
                  "flagged vacuous — OK")

        # --- Case 1: baseline — the good fixture alone must pass with zero findings.
        findings, files, vacuous = evaluate(good_dir)
        if vacuous or findings:
            failures.append("baseline")
            print(f"[check-shader-sources --self-test] FAIL — the good fixture reported "
                  f"vacuous={vacuous}, {len(findings)} finding(s), expected a clean pass: "
                  f"{[f.detail[:80] for f in findings]}")
        else:
            print("[check-shader-sources --self-test] baseline good fixture: 0 findings "
                  "(clean) — OK")

        # --- Case 2: a backtick INSIDE the shader (the exact production defect) must be
        # caught by BOTH the single-template-literal count check and the named
        # no-internal-backtick check.
        broken_dir = tmp_root / "internal-backtick"
        broken_dir.mkdir()
        broken_path = broken_dir / "selftest.frag.js"
        broken_path.write_text(
            _GOOD_FIXTURE.replace(
                "void main() {",
                "// a stray ` backtick truncates the literal here\nvoid main() {",
            ),
            encoding="utf-8",
        )
        findings, files, vacuous = evaluate(broken_dir)
        checks_hit = {f.check for f in findings}
        if vacuous or not {"single-template-literal", "no-internal-backtick"} <= checks_hit:
            failures.append("internal-backtick")
            print(f"[check-shader-sources --self-test] FAIL — internal-backtick fixture "
                  f"did not trip both expected checks (hit: {sorted(checks_hit)}, "
                  f"vacuous={vacuous}).")
        else:
            print("[check-shader-sources --self-test] internal-backtick case: caught by "
                  f"{sorted(checks_hit)} — OK")

        # --- Case 3: node --check's own blind spot, reproduced as a negative control.
        # Confirms the CLAIM this gate's docstring makes ("node --check returns exit 0
        # on a file with a top-level import/export, even when a template literal has
        # been truncated by a stray backtick") is actually true, not asserted from
        # memory. Skipped gracefully if `node` is not on PATH in this environment —
        # that is an environment gap, not a reason to fail the self-test.
        import shutil as _shutil
        import subprocess
        node_path = _shutil.which("node")
        if node_path is None:
            print("[check-shader-sources --self-test] node --check negative control: "
                  "SKIPPED (node not found on PATH) — not counted as a failure.")
        else:
            result = subprocess.run(
                [node_path, "--check", str(broken_path)],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                failures.append("node-check-negative-control")
                print(
                    "[check-shader-sources --self-test] FAIL — the negative control "
                    "assumption was wrong: `node --check` DID catch the truncated-"
                    f"template-literal fixture (exit {result.returncode}). The "
                    "docstring's claim about node --check's blind spot needs "
                    "re-verifying, not just this gate."
                )
            else:
                print(
                    "[check-shader-sources --self-test] node --check negative control: "
                    "confirmed — `node --check` exits 0 on the truncated fixture "
                    "(exactly the blind spot this gate exists to close) — OK"
                )

        # --- Case 4: missing `#version 300 es` as the first line.
        no_version_dir = tmp_root / "no-version"
        no_version_dir.mkdir()
        (no_version_dir / "selftest.frag.js").write_text(
            _GOOD_FIXTURE.replace("`#version 300 es\n", "`precision highp float;\n"),
            encoding="utf-8",
        )
        findings, files, vacuous = evaluate(no_version_dir)
        if vacuous or "version-pragma" not in {f.check for f in findings}:
            failures.append("version-pragma")
            print("[check-shader-sources --self-test] FAIL — missing `#version 300 es` "
                  "first line was not caught.")
        else:
            print("[check-shader-sources --self-test] version-pragma case: caught — OK")

        # --- Case 5: missing `void main`.
        no_main_dir = tmp_root / "no-main"
        no_main_dir.mkdir()
        (no_main_dir / "selftest.frag.js").write_text(
            _GOOD_FIXTURE.replace("void main() {\n\tfragColour = texture( u_image, v_uv );\n}\n", ""),
            encoding="utf-8",
        )
        findings, files, vacuous = evaluate(no_main_dir)
        if vacuous or "main-entrypoint" not in {f.check for f in findings}:
            failures.append("main-entrypoint")
            print("[check-shader-sources --self-test] FAIL — missing `void main(...)` "
                  "was not caught.")
        else:
            print("[check-shader-sources --self-test] main-entrypoint case: caught — OK")

        # --- Case 6: missing `out vec4`.
        no_output_dir = tmp_root / "no-output"
        no_output_dir.mkdir()
        (no_output_dir / "selftest.frag.js").write_text(
            _GOOD_FIXTURE.replace("out vec4 fragColour;\n", ""),
            encoding="utf-8",
        )
        findings, files, vacuous = evaluate(no_output_dir)
        if vacuous or "fragment-output" not in {f.check for f in findings}:
            failures.append("fragment-output")
            print("[check-shader-sources --self-test] FAIL — missing `out vec4` "
                  "declaration was not caught.")
        else:
            print("[check-shader-sources --self-test] fragment-output case: caught — OK")

        # Final — confirm the real repo's shader directory (not the temp fixtures) is
        # itself untouched by this run: --self-test must never write into src/.
        real_files_after = _find_shader_files(_SHADER_GLOB_ROOT)
        if not real_files_after:
            failures.append("real-tree-untouched")
            print("[check-shader-sources --self-test] FAIL — the real shader directory "
                  f"({_SHADER_GLOB_ROOT}) reported 0 files after the self-test run.")
        else:
            print(f"[check-shader-sources --self-test] real shader tree untouched: "
                  f"{len(real_files_after)} file(s) still present — OK")

    finally:
        import shutil as _shutil2
        _shutil2.rmtree(tmp_root, ignore_errors=True)

    if failures:
        print(f"[check-shader-sources --self-test] FAIL — unproven: {', '.join(failures)}.")
        return 1
    print("[check-shader-sources --self-test] PASS — all cases proven, including the "
          "node --check negative control (or an honest skip if node is unavailable).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
