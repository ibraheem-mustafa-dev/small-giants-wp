"""
qc_anti_cheat_checks.py
=======================
Cheat-pattern definitions, AST visitor, and file analysers.
Imported by qc-anti-cheat.py (the CLI entry point).
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass
from typing import Optional

# ---------------------------------------------------------------------------
# Constants — client slugs, section names, forbidden values
# ---------------------------------------------------------------------------

CLIENT_SLUGS = (
    "mamas-munches",
    "indus-foods",
    "helping-doctors",
    "helpingdoctors",
    "palestine-lives",
    "dream-wedding",
    "workwear-now",
    "mosque-eye-care",
    "professional",
    "healthcare",
    "construction",
    "eye-care",
)

SECTION_NAMES = (
    "brand",
    "hero",
    "ingredients",
    "ingredients-section",
    "gift-section",
    "trust-bar",
    "social-proof",
    "featured-product",
    "header",
    "footer",
)

# Hex colours that must not be hard-coded in converter logic.
FORBIDDEN_HEX = re.compile(
    r"#(?:F5C2C8|0F7E80|D8CA50|F87A1F|0A7EA8|1B8A5A|0A5C3A|E8F5F0|"
    r"075E80|0A5B5D|FEE8D4|2E7D4F|25D366|C0D5D6|0D5557)\b",
    re.IGNORECASE,
)

FORBIDDEN_FONTS = (
    "DM Serif Display",
    "DM Sans",
    "Montserrat",
    "Source Sans 3",
)

# Minimum ratio of section/client keys for the "suspicious dict" heuristic.
SUSPICIOUS_DICT_RATIO = 0.5


# ---------------------------------------------------------------------------
# Data type
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    file: str
    line: int
    pattern: str
    evidence: str
    severity: str  # "fail" | "warn"


# ---------------------------------------------------------------------------
# AST visitor
# ---------------------------------------------------------------------------

class CheatVisitor(ast.NodeVisitor):
    """Walk a Python AST and collect cheat-pattern findings."""

    def __init__(self, filepath: str) -> None:
        self.filepath = filepath
        self.findings: list[Finding] = []

    def _add(self, node: ast.AST, pattern: str, evidence: str) -> None:
        lineno = getattr(node, "lineno", 0)
        self.findings.append(Finding(
            file=self.filepath, line=lineno,
            pattern=pattern, evidence=evidence, severity="fail",
        ))

    def _is_string(self, node: ast.expr) -> bool:
        return isinstance(node, ast.Constant) and isinstance(node.value, str)

    def _string_val(self, node: ast.expr) -> Optional[str]:
        return node.value if self._is_string(node) else None  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Internal checkers
    # ------------------------------------------------------------------

    def _check_slug(self, node: ast.AST, value: str, context: str) -> None:
        for slug in CLIENT_SLUGS:
            if slug in value:
                self._add(node, "client-slug-in-code",
                          f"{context}: {value!r} contains client slug {slug!r}")

    def _check_section_name(self, node: ast.AST, value: str, context: str) -> None:
        for name in SECTION_NAMES:
            if value == name or value == f"sgs-{name}":
                self._add(node, "section-name-in-code",
                          f"{context}: {value!r} is a reserved section name")

    def _check_hex_font(self, node: ast.AST, value: str) -> None:
        if FORBIDDEN_HEX.search(value):
            self._add(node, "hardcoded-colour",
                      f"Hard-coded colour constant: {value!r}")
        for font in FORBIDDEN_FONTS:
            if font.lower() in value.lower():
                self._add(node, "hardcoded-font",
                          f"Hard-coded font constant: {value!r}")

    # ------------------------------------------------------------------
    # Visitors
    # ------------------------------------------------------------------

    def visit_Dict(self, node: ast.Dict) -> None:  # noqa: N802
        str_keys = [self._string_val(k) for k in node.keys if self._is_string(k)]
        if str_keys:
            total = len(str_keys)
            slug_hits = sum(1 for k in str_keys if k and any(s in k for s in CLIENT_SLUGS))
            sect_hits = sum(1 for k in str_keys if k and k in SECTION_NAMES)
            if total >= 2:
                if (slug_hits / total) >= SUSPICIOUS_DICT_RATIO:
                    self._add(node, "client-slug-dict",
                              f"Dict with {slug_hits}/{total} keys matching client slugs")
                if (sect_hits / total) >= SUSPICIOUS_DICT_RATIO:
                    self._add(node, "section-name-dict",
                              f"Dict with {sect_hits}/{total} keys matching section names")
            for key in node.keys:
                v = self._string_val(key)
                if v:
                    self._check_slug(key, v, "dict-key")
                    self._check_section_name(key, v, "dict-key")
                    self._check_hex_font(key, v)
        self.generic_visit(node)

    def visit_Compare(self, node: ast.Compare) -> None:  # noqa: N802
        left_val = self._string_val(node.left)
        comparators = [self._string_val(c) for c in node.comparators]
        all_vals = ([left_val] if left_val else []) + [v for v in comparators if v]
        for v in all_vals:
            self._check_slug(node, v, "compare")
            self._check_section_name(node, v, "compare")
        self.generic_visit(node)

    def visit_Constant(self, node: ast.Constant) -> None:  # noqa: N802
        if isinstance(node.value, str):
            self._check_hex_font(node, node.value)
        self.generic_visit(node)

    def visit_If(self, node: ast.If) -> None:  # noqa: N802
        hits = self._collect_if_chain_section_hits(node)
        if len(hits) >= 2:
            self._add(node, "section-if-chain",
                      f"if/elif chain with {len(hits)} section-name comparisons: "
                      + ", ".join(repr(h) for h in hits))
        self.generic_visit(node)

    def _collect_if_chain_section_hits(self, node: ast.If) -> list[str]:
        hits: list[str] = []
        current: Optional[ast.If] = node
        while current is not None:
            self._extract_section_comparisons(current.test, hits)
            orelse = current.orelse
            current = orelse[0] if len(orelse) == 1 and isinstance(orelse[0], ast.If) else None
        return hits

    def _extract_section_comparisons(self, node: ast.expr, hits: list[str]) -> None:
        if isinstance(node, ast.Compare):
            for v in [self._string_val(node.left)] + [self._string_val(c) for c in node.comparators]:
                if v and v in SECTION_NAMES:
                    hits.append(v)
        elif isinstance(node, ast.BoolOp):
            for value in node.values:
                self._extract_section_comparisons(value, hits)


# ---------------------------------------------------------------------------
# Public analysers
# ---------------------------------------------------------------------------

def analyse_python_file(filepath: str, content: str) -> list[Finding]:
    """Parse and AST-walk a Python source file, returning findings."""
    try:
        tree = ast.parse(content, filename=filepath)
    except SyntaxError as exc:
        return [Finding(
            file=filepath, line=exc.lineno or 0,
            pattern="parse-error",
            evidence=f"SyntaxError: {exc.msg}",
            severity="warn",
        )]
    visitor = CheatVisitor(filepath)
    visitor.visit(tree)
    return visitor.findings


def analyse_text_file(filepath: str, content: str) -> list[Finding]:
    """Regex-scan a non-Python file for forbidden hex strings and client slugs."""
    findings: list[Finding] = []
    for lineno, line in enumerate(content.splitlines(), start=1):
        if FORBIDDEN_HEX.search(line):
            findings.append(Finding(
                file=filepath, line=lineno,
                pattern="hardcoded-colour",
                evidence=line.strip(),
                severity="fail",
            ))
        for slug in CLIENT_SLUGS:
            if f'"{slug}"' in line or f"'{slug}'" in line:
                findings.append(Finding(
                    file=filepath, line=lineno,
                    pattern="client-slug-in-code",
                    evidence=line.strip(),
                    severity="fail",
                ))
    return findings
