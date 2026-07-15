"""
BEM compliance lint — Stage 0.1 of /sgs-clone (Spec 31).

Checks every class token in a Bean-controlled HTML draft against the canonical
SGS-BEM naming convention:

    .sgs-<block>__<element>--<modifier>

Regex (dot-prefixed form, written as a raw string in code):
    ^[.]sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$

The lint operates on TOKEN strings extracted from class="..." attributes (i.e.
whitespace-split tokens WITHOUT a leading dot).  Internally the dot is prepended
before matching so the canonical regex is used verbatim.

Three modes (Spec 31):
  strict  — violations halt the pipeline; exit_code=1 if any violations.
  draft   — violations logged as warnings; pipeline continues; exit_code=0.
  legacy  — short-circuit; no violations reported; exit_code=0.

Exempt classes (Spec 00 §3.1 / lingua-franca-conversion rule):
  1. WordPress-core patterns  — wp-*, has-*, is-*, block-editor-*, alignwide,
     alignfull, aligncenter, alignleft, alignright, screen-reader-text
  2. Tailwind-like utility tokens — single lower-kebab token ≤ 30 chars that
     does NOT start with "sgs-" (heuristic; not a whitelist).
  3. Any token starting with "sgs-" MUST satisfy the full BEM regex — the
     Tailwind exemption never applies to sgs-* classes.

Used by:
  - /sgs-clone orchestrator (Stage 0.1)
  - Pre-commit hook enforcing Stage 0.1 on sites/*/mockups/ files (FR39)
"""

from __future__ import annotations

import argparse
import dataclasses
import html.parser
import json
import re
import sys
from pathlib import Path
from typing import Literal

# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

Mode = Literal["strict", "draft", "legacy"]

_VALID_MODES: tuple[str, ...] = ("strict", "draft", "legacy")


@dataclasses.dataclass
class Violation:
    """A single class-token that failed the SGS-BEM check."""

    source_label: str      # file path or "<string>"
    line: int
    col: int
    token: str             # the raw class token (no leading dot)
    message: str
    is_warning: bool = False   # True when mode == "draft"


@dataclasses.dataclass
class LintResult:
    """Aggregate result from linting one HTML document."""

    violations: list[Violation]
    mode: Mode
    total_classes_checked: int
    passed: bool    # True iff violations == 0 OR mode in ("draft", "legacy")
    exit_code: int  # 0 unless mode == "strict" AND violations > 0


# ---------------------------------------------------------------------------
# Regex + exemption helpers
# ---------------------------------------------------------------------------

# Dot-prefixed canonical regex (exactly as stated in Spec 00 §3.1).
_SGS_BEM_RE = re.compile(
    r"^\.sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$"
)  # noqa: W605 — raw regex; the leading \. is the dot-prefix, not a Python escape

# WordPress-core prefix patterns that are always exempt.
_WP_CORE_PREFIXES: tuple[str, ...] = (
    "wp-",
    "has-",
    "is-",
    "block-editor-",
    "wp-block-",
)

# WordPress-core literal utility classes that are always exempt.
_WP_CORE_LITERALS: frozenset[str] = frozenset(
    {
        "alignwide",
        "alignfull",
        "aligncenter",
        "alignleft",
        "alignright",
        "screen-reader-text",
    }
)

# Heuristic patterns for Tailwind-like utility tokens (not a whitelist —
# just enough to avoid false positives on real utility classes while still
# catching semantic names like "hero-copy").
#
# Tailwind utilities come in two shapes:
#   1. Single-word, no hyphen: flex, grid, hidden, container, clearfix …
#   2. Prefix-scale pairs where the SCALE segment contains a digit or is a
#      known alphabetic shorthand: mx-4, text-lg, bg-red-500, p-0, w-full …
#
# Two-segment all-alpha names like "hero-copy" look like semantic component
# names and are intentionally NOT exempt — they are the violations this lint
# is designed to catch.
_TAILWIND_SINGLE_WORD_RE = re.compile(r"^[a-z][a-z0-9]*$")          # e.g. flex, grid, hidden
_TAILWIND_PREFIX_SCALE_RE = re.compile(                               # e.g. mx-4, text-lg, bg-red-500
    r"^[a-z][a-z0-9]*(-[a-z0-9]+)*-[0-9]"                           # ends in a digit-led scale
    r"|^[a-z][a-z0-9]*-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl"
    r"|auto|full|screen|none|normal|tight|snug|relaxed|loose|inherit|initial|unset)$"
)
_TAILWIND_MAX_LEN = 30


def _is_exempt(token: str) -> bool:
    """Return True if *token* is exempt from BEM validation."""
    # WordPress-core literals.
    if token in _WP_CORE_LITERALS:
        return True

    # WordPress-core prefix patterns.
    for prefix in _WP_CORE_PREFIXES:
        if token.startswith(prefix):
            return True

    # sgs-* tokens are NEVER exempt — must satisfy the full BEM regex.
    if token.startswith("sgs-"):
        return False

    if len(token) > _TAILWIND_MAX_LEN:
        return False

    # Single-word tokens (no hyphen) — e.g. flex, grid, container.
    if _TAILWIND_SINGLE_WORD_RE.fullmatch(token):
        return True

    # Prefix-scale pairs where the scale contains a digit or known shorthand.
    if _TAILWIND_PREFIX_SCALE_RE.fullmatch(token):
        return True

    return False


def _check_token(token: str) -> bool:
    """Return True if *token* passes the SGS-BEM regex (dot prepended internally)."""
    return _SGS_BEM_RE.fullmatch("." + token) is not None


# ---------------------------------------------------------------------------
# HTML parser — extracts class tokens with line/column positions
# ---------------------------------------------------------------------------

class _ClassExtractor(html.parser.HTMLParser):
    """Subclass of HTMLParser that collects (token, line, col) tuples."""

    def __init__(self) -> None:
        super().__init__()
        self._tokens: list[tuple[str, int, int]] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        # <style> / <script> contents arrive via handle_data only — they have
        # no class= attributes — so we don't need a state flag to gate them.
        if tag in ("style", "script"):
            return

        # getpos() returns (line, offset) where offset is byte-position of the
        # tag start on that line (not the attribute).  It's the best granularity
        # HTMLParser exposes without a third-party library.
        line, col = self.getpos()

        for attr_name, attr_value in attrs:
            if attr_name == "class" and attr_value:
                for token in attr_value.split():
                    if token:
                        self._tokens.append((token, line, col))

    def handle_data(self, data: str) -> None:
        # Intentionally a no-op: we only care about element attributes.
        pass

    @property
    def tokens(self) -> list[tuple[str, int, int]]:
        return self._tokens


def _extract_tokens(html: str) -> list[tuple[str, int, int]]:
    """Parse *html* and return list of (token, line, col) for every class token."""
    parser = _ClassExtractor()
    parser.feed(html)
    return parser.tokens


# ---------------------------------------------------------------------------
# Core lint logic
# ---------------------------------------------------------------------------

def _lint_tokens(
    tokens: list[tuple[str, int, int]],
    mode: Mode,
    source_label: str,
) -> LintResult:
    """
    Given extracted tokens and a mode, produce a LintResult.

    Behaviour:
      legacy  — return immediately with zero violations, passed=True.
      strict  — violations → passed=False, exit_code=1.
      draft   — violations marked as warnings, passed=True, exit_code=0.
    """
    if mode == "legacy":
        return LintResult(
            violations=[],
            mode=mode,
            total_classes_checked=0,
            passed=True,
            exit_code=0,
        )

    violations: list[Violation] = []
    total = 0
    is_warning = mode == "draft"

    for token, line, col in tokens:
        if _is_exempt(token):
            continue
        total += 1
        if not _check_token(token):
            violations.append(
                Violation(
                    source_label=source_label,
                    line=line,
                    col=col,
                    token=token,
                    message=(
                        f"class '{token}' does not match the SGS-BEM regex "
                        f"(expected .sgs-<block>__<element>--<modifier>)"
                    ),
                    is_warning=is_warning,
                )
            )

    total_checked = total
    passed = not (mode == "strict" and violations)
    exit_code = 0 if passed else 1

    return LintResult(
        violations=violations,
        mode=mode,
        total_classes_checked=total_checked,
        passed=passed,
        exit_code=exit_code,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def lint_html_string(
    html: str,
    mode: Mode = "strict",
    source_label: str = "<string>",
) -> LintResult:
    """
    Lint a string of HTML's classes against the SGS-BEM regex.

    Used by the /sgs-clone orchestrator and the pre-commit hook.
    """
    tokens = _extract_tokens(html)
    return _lint_tokens(tokens, mode, source_label)


def lint_html_file(path: Path, mode: Mode = "strict") -> LintResult:
    """
    Lint a single HTML file's classes against the SGS-BEM regex.

    Raises FileNotFoundError if *path* does not exist.
    """
    content = path.read_text(encoding="utf-8")
    return lint_html_string(content, mode=mode, source_label=str(path))


# ---------------------------------------------------------------------------
# Human-readable output
# ---------------------------------------------------------------------------

def _format_human(result: LintResult) -> str:
    """Return a human-readable report string."""
    lines: list[str] = []
    level = "warning" if result.mode == "draft" else "error"

    for v in result.violations:
        lines.append(
            f"{v.source_label}:{v.line}:{v.col}: {level}: {v.message}"
        )

    total_v = len(result.violations)
    status = "PASS" if result.passed else "FAIL"
    lines.append(
        f"\n{status} - {total_v} violation(s) in {result.total_classes_checked} "
        f"SGS-prefixed or uncategorised class(es) checked [mode={result.mode}]"
    )
    return "\n".join(lines)


def _format_json(result: LintResult) -> str:
    """Return the LintResult as a JSON string for orchestrator consumption."""
    data = {
        "mode": result.mode,
        "total_classes_checked": result.total_classes_checked,
        "passed": result.passed,
        "exit_code": result.exit_code,
        "violation_count": len(result.violations),
        "violations": [
            {
                "source_label": v.source_label,
                "line": v.line,
                "col": v.col,
                "token": v.token,
                "message": v.message,
                "is_warning": v.is_warning,
            }
            for v in result.violations
        ],
    }
    return json.dumps(data, indent=2)


# ---------------------------------------------------------------------------
# Self-tests
# ---------------------------------------------------------------------------

_HTML_MALFORMED = '<div class="hero-copy">'

_SELF_TEST_CASES: list[tuple[str, str, Mode, int, int]] = [
    # (name, html, mode, expected_violations, expected_exit_code)
    (
        "compliant HTML",
        '<div class="sgs-hero sgs-hero__headline sgs-hero__cta--primary">',
        "strict",
        0,
        0,
    ),
    (
        "malformed HTML strict",
        _HTML_MALFORMED,
        "strict",
        1,
        1,
    ),
    (
        "mixed file",
        '<div class="sgs-card sgs-card__title hero-copy wp-block-group flex">',
        "strict",
        1,
        1,
    ),
    (
        "draft mode on malformed",
        _HTML_MALFORMED,
        "draft",
        1,
        0,
    ),
    (
        "legacy mode on malformed",
        _HTML_MALFORMED,
        "legacy",
        0,
        0,
    ),
]


def _run_self_tests() -> int:
    """Run built-in self-tests. Returns 0 on all pass, 1 on any failure."""
    failures = 0

    for name, html_str, mode, expected_violations, expected_exit_code in _SELF_TEST_CASES:
        result = lint_html_string(html_str, mode=mode, source_label="<test>")

        try:
            assert len(result.violations) == expected_violations, (
                f"expected {expected_violations} violation(s), "
                f"got {len(result.violations)}: "
                + ", ".join(v.token for v in result.violations)
            )
            assert result.exit_code == expected_exit_code, (
                f"expected exit_code={expected_exit_code}, "
                f"got exit_code={result.exit_code}"
            )

            # Extra mode-specific assertions.
            if mode == "draft" and result.violations:
                assert all(v.is_warning for v in result.violations), (
                    "draft mode violations should be marked is_warning=True"
                )
                assert result.passed is True, (
                    "draft mode should always set passed=True"
                )
            if mode == "legacy":
                assert result.passed is True, (
                    "legacy mode should always set passed=True"
                )

            print(f"  [PASS] {name}")

        except AssertionError as exc:
            print(f"  [FAIL] {name}: {exc}")
            failures += 1

    if failures == 0:
        print("\nAll self-tests passed.")
        return 0
    else:
        print(f"\n{failures} self-test(s) FAILED.")
        return 1


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="SGS BEM compliance lint — Stage 0.1 of /sgs-clone.",
    )
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        help="Path to the HTML file to lint.",
    )
    parser.add_argument(
        "--mode",
        choices=_VALID_MODES,
        default="strict",
        help="Lint mode: strict (default), draft, or legacy.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="output_json",
        help="Emit LintResult as JSON (for orchestrator consumption).",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        dest="self_test",
        help="Run built-in self-tests and exit.",
    )
    return parser


def main() -> int:
    """CLI main — returns exit code."""
    parser = _build_arg_parser()
    args = parser.parse_args()

    if args.self_test:
        print("Running SGS BEM lint self-tests...\n")
        return _run_self_tests()

    if args.path is None:
        parser.print_help()
        return 1

    try:
        result = lint_html_file(args.path, mode=args.mode)
    except FileNotFoundError:
        print(f"Error: file not found: {args.path}", file=sys.stderr)
        return 1

    if args.output_json:
        print(_format_json(result))
    else:
        print(_format_human(result))

    return result.exit_code


if __name__ == "__main__":
    sys.exit(main())
