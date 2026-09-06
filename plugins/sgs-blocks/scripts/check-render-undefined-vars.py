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
import subprocess
import sys
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
    "$overlay_gradient_value, $overlay_opacity );"
)
FIXTURE_BROKEN = (
    "$overlay_decls = sgs_overlay_decls( $overlay_colour_raw, "
    "$overlay_gradient, $overlay_opacity );"
)
FIXTURE_EXPECTED = "Variable $overlay_gradient might not be defined."

INSTALL_HINT = (
    "PHPStan is not installed. `vendor/` is gitignored, so a fresh clone does not\n"
    "  have it. Install the pinned version (composer.lock already pins it):\n\n"
    "      cd plugins/sgs-blocks && php ../../composer.phar install\n"
)


def _phpstan_missing() -> bool:
    return not (PHPSTAN.exists() or PHPSTAN.with_suffix(".bat").exists())


def _run(paths=None):
    """Run PHPStan and return (exit_code, findings).

    Findings come from the JSON formatter, so this never depends on parsing
    human-readable output that PHPStan is free to restyle between releases.
    """
    cmd = [
        "php",
        str(PHPSTAN),
        "analyse",
        "-c",
        str(CONFIG),
        "--no-progress",
        "--error-format=json",
        "--memory-limit=1G",
    ]
    if paths:
        cmd += [str(p) for p in paths]

    proc = subprocess.run(
        cmd,
        cwd=str(PLUGIN_ROOT),
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
            "render template (PHPStan level 1, 18 baselined)."
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


def self_test():
    """Reintroduce the real hero defect and prove the gate reports it.

    Runs THREE assertions, not one. A positive control alone would still pass if the
    gate reported that error unconditionally; a negative control alone would still pass
    if the gate reported nothing, ever.
    """
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

    # --- Assertion 1: negative control. The unmodified tree must be silent. ----------
    _, clean = _run([FIXTURE_FILE])
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
    try:
        FIXTURE_FILE.write_text(
            original.replace(FIXTURE_FIXED, FIXTURE_BROKEN),
            encoding="utf-8",
            newline="",
        )
        _, broken = _run([FIXTURE_FILE])
        caught = [f for f in broken if FIXTURE_EXPECTED in f["message"]]
    finally:
        FIXTURE_FILE.write_text(original, encoding="utf-8", newline="")

    if not caught:
        sys.stderr.write(
            "[render-undefined-vars --self-test] FAIL — the hero overlay-gradient defect\n"
            "  was reintroduced and the gate did NOT report it. The gate is vacuous for\n"
            "  the exact bug it was built for.\n"
        )
        return 1
    print(
        "[render-undefined-vars --self-test] positive control: hero defect reintroduced "
        "— caught at line %s: %s — restored" % (caught[0]["line"], caught[0]["message"])
    )

    # --- Assertion 3: the restore actually landed. ------------------------------------
    if FIXTURE_FILE.read_text(encoding="utf-8") != original:
        sys.stderr.write(
            "[render-undefined-vars --self-test] FAIL — the fixture file was NOT restored\n"
            "  byte-for-byte. Restore it from git before committing anything.\n"
        )
        return 1
    _, restored = _run([FIXTURE_FILE])
    if any(FIXTURE_EXPECTED in f["message"] for f in restored):
        sys.stderr.write(
            "[render-undefined-vars --self-test] FAIL — the defect is still reported\n"
            "  after restore.\n"
        )
        return 1
    print("[render-undefined-vars --self-test] post-restore: clean again — OK")

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
