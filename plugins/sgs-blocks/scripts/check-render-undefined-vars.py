#!/usr/bin/env python3
"""Undefined-variable gate for block render templates (PHPStan level 1).

WHY THIS EXISTS
---------------
`hero/render.php` passed `$overlay_gradient` to `sgs_overlay_decls()`. That variable
never existed in the file — one read, zero assignments, for its entire history. PHP
evaluates an undefined variable to `null` and emits a notice; notices are not surfaced.
So the client's configured gradient was not dropped to nothing, it was silently replaced
by the flat overlay colour — which is exactly why it survived. `overlayGradient` is a
declared attribute with a real editor control, so the defect was fully client-reachable.

Nothing in the ~55-gate prebuild chain could see it. An IDE static analyser caught it in
seconds the moment the file was opened, which proves the class is statically detectable
and that the gap was tooling, not attention. Evidence:
`reports/visual-diff/hero-overlay-gradient-2026-08-21.md`.

WHAT THIS WRAPS
---------------
`phpstan-render.neon` — PHPStan at level 1 over `src/blocks`. This script exists rather
than a bare `phpstan` line in `prebuild` for two reasons a raw invocation cannot give:

  1. FAIL CLOSED when PHPStan is absent. `vendor/` is gitignored, so a fresh clone or a
     new worktree has no PHPStan at all. A gate that skips-and-passes in that situation
     is indistinguishable from a gate that cannot fail — the precise failure this whole
     gate was written to end. It exits non-zero with the install command instead.
  2. `--self-test`, which reintroduces the real hero defect and proves the gate goes red
     for it. A gate that has never been observed failing is a hypothesis, not a defence.

USAGE
-----
    python scripts/check-render-undefined-vars.py --check       # the build gate
    python scripts/check-render-undefined-vars.py --self-test   # prove it can fail
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
CONFIG = PLUGIN_ROOT / "phpstan-render.neon"
BASELINE = PLUGIN_ROOT / "phpstan-render-baseline.neon"
PHPSTAN = PLUGIN_ROOT / "vendor" / "bin" / "phpstan"

# The self-test fixture IS the real defect, on the real file, at its real call site.
# A synthetic snippet would prove PHPStan works; this proves THIS GATE, with THIS
# config and THIS baseline, catches the exact bug that motivated it.
FIXTURE_FILE = PLUGIN_ROOT / "src" / "blocks" / "hero" / "render.php"
FIXTURE_FIXED = (
    "$overlay_decls = sgs_overlay_decls( $overlay_colour_raw, "
    "$overlay_gradient_value, $overlay_opacity, $overlay_blend_mode );"
)
FIXTURE_BROKEN = (
    "$overlay_decls = sgs_overlay_decls( $overlay_colour_raw, "
    "$overlay_gradient, $overlay_opacity, $overlay_blend_mode );"
)
FIXTURE_EXPECTED = "Variable $overlay_gradient might not be defined."

INSTALL_HINT = (
    "PHPStan is not installed. `vendor/` is gitignored, so a fresh clone does not\n"
    "  have it. Install the pinned version (composer.lock already pins it):\n\n"
    "      cd plugins/sgs-blocks && php ../../composer.phar install\n"
)


def _phpstan_missing() -> bool:
    return not (PHPSTAN.exists() or PHPSTAN.with_suffix(".bat").exists())


PARTIAL_REQUIRE_RE = re.compile(
    r"(?<![\w$>:])(?:require|include)(?!_once)\s*\(?\s*__DIR__\s*\.\s*['\"]/([\w.-]+\.php)['\"]\s*\)?\s*;"
)


def _inline_partials(src, block_dir, inlined, depth=0):
    """`src` with each plain require/include of a file in the block's own folder
    replaced by that file's code, as PHP runs it: in the caller's scope. Partials
    inside partials too. require_once loads a function file and is left alone."""
    if depth > 4:
        return src

    def repl(m):
        part = block_dir / m.group(1)
        if not part.is_file():
            return m.group(0)
        inlined.add(part.name)
        body = re.sub(r"\A\s*<\?php", "", part.read_text(encoding="utf-8", errors="replace"))
        # `?><?php` returns to PHP mode whether the partial ended in PHP or in HTML.
        return "\n" + _inline_partials(body, block_dir, inlined, depth + 1) + "\n?><?php\n"

    return PARTIAL_REQUIRE_RE.sub(repl, src)


def _rooted_config():
    """This gate's config with vendor, includes and the bootstrap made absolute, so a
    copy of it analyses another tree's src/blocks with the real symbols."""
    return re.sub(
        r"(?m)^(\s*-\s+)(vendor/|includes\b|sgs-blocks\.php)",
        lambda m: m.group(1) + PLUGIN_ROOT.as_posix() + "/" + m.group(2),
        CONFIG.read_text(encoding="utf-8"),
    )


def _template_tree(root):
    """Under `root`: every block PHP file, each render.php with its plain-required
    partials inlined and those partials left empty, plus this gate's config and
    baseline pointing at the real vendor and includes. PHPStan reads one file at a
    time, so a partial's inherited locals, and render.php's reads of what a partial
    assigns, would otherwise all read as undefined."""
    blocks = PLUGIN_ROOT / "src" / "blocks"
    for php in sorted(blocks.rglob("*.php")):
        dest = root / php.relative_to(PLUGIN_ROOT)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(php.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")
    for render in sorted(blocks.glob("*/render.php")):
        inlined = set()
        merged = _inline_partials(render.read_text(encoding="utf-8", errors="replace"), render.parent, inlined)
        if not inlined:
            continue
        out_dir = root / render.parent.relative_to(PLUGIN_ROOT)
        (out_dir / "render.php").write_text(merged, encoding="utf-8")
        for name in inlined:
            (out_dir / name).write_text("<?php\n", encoding="utf-8")
    (root / CONFIG.name).write_text(_rooted_config(), encoding="utf-8")
    (root / BASELINE.name).write_text(BASELINE.read_text(encoding="utf-8"), encoding="utf-8")


def _run(paths=None):
    """Run PHPStan and return (exit_code, findings).

    Findings come from the JSON formatter, so this never depends on parsing
    human-readable output that PHPStan is free to restyle between releases.
    With no `paths` it analyses the inlined template tree (`_template_tree`);
    finding paths are plugin-relative either way.
    """
    if paths:
        return _run_in(PLUGIN_ROOT, CONFIG, paths)
    with tempfile.TemporaryDirectory(prefix="sgs-render-vars-") as tmp:
        root = Path(tmp)
        _template_tree(root)
        return _run_in(root, root / CONFIG.name, None)


def _run_in(root, config, paths):
    cmd = [
        "php",
        str(PHPSTAN),
        "analyse",
        "-c",
        str(config),
        "--no-progress",
        "--error-format=json",
        "--memory-limit=2G",  # 2G since the 4.5 MB WooCommerce stub (2026-09-24); 1G ran out
    ]
    if paths:
        cmd += [str(p) for p in paths]

    proc = subprocess.run(
        cmd,
        cwd=str(root),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    findings = []
    stdout = proc.stdout or ""
    start = stdout.find("{")
    payload = None
    if start != -1:
        try:
            payload = json.loads(stdout[start:])
        except json.JSONDecodeError:
            payload = None

    if payload:
        for path, entry in (payload.get("files") or {}).items():
            for message in entry.get("messages", []):
                try:
                    path = Path(path).resolve().relative_to(Path(root).resolve()).as_posix()
                except (ValueError, OSError):
                    pass
                findings.append(
                    {
                        "path": path,
                        "line": message.get("line"),
                        "message": message.get("message", ""),
                    }
                )
        for message in payload.get("errors", []):
            findings.append({"path": "(global)", "line": None, "message": message})

    return proc.returncode, findings


def _relative(path):
    try:
        return str(Path(path).resolve().relative_to(PLUGIN_ROOT)).replace("\\", "/")
    except (ValueError, OSError):
        return path


def check():
    if _phpstan_missing():
        sys.stderr.write("[render-undefined-vars] FAIL — " + INSTALL_HINT + "\n")
        sys.stderr.write(
            "  This gate fails closed on purpose. Skipping-and-passing here would make\n"
            "  it indistinguishable from a gate that cannot fail.\n"
        )
        return 1

    if not BASELINE.exists():
        sys.stderr.write(
            "[render-undefined-vars] FAIL — baseline missing: "
            + BASELINE.name
            + ". It is\n  committed and reviewable by design; regenerating it silently"
            " would let new\n  findings be absorbed instead of reported.\n"
        )
        return 1

    code, findings = _run()
    if code == 0 and not findings:
        print(
            "[render-undefined-vars] OK — no new undefined variables in any block "
            "render template (PHPStan level 1, %d baselined)." % BASELINE.read_text(encoding="utf-8").count("message:")
        )
        return 0

    sys.stderr.write(
        "[render-undefined-vars] FAIL — %d finding(s) not in the baseline:\n"
        % len(findings)
    )
    for finding in findings:
        sys.stderr.write(
            "  %s:%s: %s\n"
            % (_relative(finding["path"]), finding["line"], finding["message"])
        )
    sys.stderr.write(
        "\n  An undefined variable in a render.php evaluates to null with an unsurfaced\n"
        "  notice — the client's setting silently does nothing. Fix the variable; do NOT\n"
        "  add it to phpstan-render-baseline.neon to make this go away.\n"
    )
    return 1


def _self_test_partials():
    """A partial reads render.php's locals, and a typo inside it still fails."""
    with tempfile.TemporaryDirectory(prefix="sgs-render-vars-selftest-") as tmp:
        root = Path(tmp)
        block = root / "src" / "blocks" / "x"
        block.mkdir(parents=True)
        render_src = "<?php\n$shared = (string) ( $attributes['a'] ?? '' );\nrequire __DIR__ . '/part.php';\necho $made;\n"
        (block / "part.php").write_text("<?php\n$made = $shared . $shraed;\n", encoding="utf-8")
        inlined = set()
        (block / "render.php").write_text(_inline_partials(render_src, block, inlined), encoding="utf-8")
        (block / "part.php").write_text("<?php\n", encoding="utf-8")
        (root / CONFIG.name).write_text(_rooted_config().replace("  - phpstan-render-baseline.neon\n", ""), encoding="utf-8")
        _, partial = _run_in(root, root / CONFIG.name, None)
    messages = [f["message"] for f in partial]
    if not any("$shraed" in m for m in messages) or any("$shared" in m or "$made" in m for m in messages):
        sys.stderr.write(
            "[render-undefined-vars --self-test] FAIL — partial inlining: expected only $shraed\n"
            "  (a typo inside the partial) to be reported, got: %s\n" % messages
        )
        return 1
    print("[render-undefined-vars --self-test] partial: inherited locals defined, typo caught — OK")
    return 0


def _run_fixture(source):
    """PHPStan findings for `source` analysed as hero/render.php, with this gate's
    config and baseline, in a temp tree. The real file is never written, so the
    self-test is safe in the fast tier on a tree other sessions are editing."""
    with tempfile.TemporaryDirectory(prefix="sgs-render-vars-fixture-") as tmp:
        root = Path(tmp)
        # The whole block tree, because the baseline names files in other blocks and
        # PHPStan refuses a config whose ignoreErrors paths do not exist.
        _template_tree(root)
        dest = root / FIXTURE_FILE.relative_to(PLUGIN_ROOT)
        dest.write_text(source, encoding="utf-8", newline="")
        code, findings = _run_in(root, root / CONFIG.name, [dest])
    if code != 0 and not findings:
        raise RuntimeError(
            "PHPStan exited %d with no parseable findings on the fixture tree (a config "
            "error reads as 'nothing found', which would make both controls vacuous)." % code
        )
    return findings


def self_test():
    """Reintroduce the real hero defect in a temp copy and prove the gate reports it.

    Runs THREE assertions, not one. A positive control alone would still pass if the
    gate reported that error unconditionally; a negative control alone would still pass
    if the gate reported nothing, ever.
    """
    if _self_test_partials():
        return 1

    if _phpstan_missing():
        sys.stderr.write(
            "[render-undefined-vars --self-test] " + INSTALL_HINT + "\n"
        )
        return 1

    original = FIXTURE_FILE.read_text(encoding="utf-8")

    if original.count(FIXTURE_FIXED) != 1:
        sys.stderr.write(
            "[render-undefined-vars --self-test] FAIL — the fixture anchor was not found\n"
            "  exactly once in " + FIXTURE_FILE.name + ". Nothing was broken, so a passing\n"
            "  run would prove nothing. This is a false negative control, not a green\n"
            "  gate. Update FIXTURE_FIXED to the current call site.\n"
        )
        return 1

    # --- Assertion 1: negative control. The unmodified hero must be silent. ----------
    clean = _run_fixture(original)
    if any(FIXTURE_EXPECTED in f["message"] for f in clean):
        sys.stderr.write(
            "[render-undefined-vars --self-test] FAIL — the unmodified hero already\n"
            "  reports the fixture error, so the positive control below could not tell\n"
            "  a working gate from a stuck one.\n"
        )
        return 1
    print(
        "[render-undefined-vars --self-test] negative control: clean hero is silent — OK"
    )

    # --- Assertion 2: positive control. The real bug must be caught. -----------------
    broken = _run_fixture(original.replace(FIXTURE_FIXED, FIXTURE_BROKEN))
    caught = [f for f in broken if FIXTURE_EXPECTED in f["message"]]

    if not caught:
        sys.stderr.write(
            "[render-undefined-vars --self-test] FAIL — the hero overlay-gradient defect\n"
            "  was reintroduced and the gate did NOT report it. The gate is vacuous for\n"
            "  the exact bug it was built for.\n"
        )
        return 1
    print(
        "[render-undefined-vars --self-test] positive control: hero defect reintroduced "
        "in a temp copy — caught at line %s: %s" % (caught[0]["line"], caught[0]["message"])
    )

    # --- Assertion 3: the real file was never touched. --------------------------------
    if FIXTURE_FILE.read_text(encoding="utf-8") != original:
        sys.stderr.write(
            "[render-undefined-vars --self-test] FAIL — hero/render.php changed while the\n"
            "  self-test ran. The controls must only ever write their temp copy.\n"
        )
        return 1
    print("[render-undefined-vars --self-test] real hero/render.php untouched — OK")

    print(
        "[render-undefined-vars --self-test] PASS — the gate goes red for the real defect."
    )
    return 0


def main():
    parser = argparse.ArgumentParser(description="PHPStan undefined-variable gate.")
    parser.add_argument("--check", action="store_true", help="run the build gate")
    parser.add_argument("--self-test", action="store_true", help="prove the gate can fail")
    args = parser.parse_args()

    if args.self_test:
        return self_test()
    if args.check:
        return check()
    parser.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
