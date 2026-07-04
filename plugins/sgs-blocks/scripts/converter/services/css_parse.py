"""css_parse — shared CSS-text-to-rule-dict parser (ported off the frozen tree).

PORTED (EXECUTION Step 16 / Phase 6): faithful copy of
``orchestrator.converter_v2.convert.parse_css`` + its two private regex
helpers (``_RULE_RE``, ``_DECL_RE``) and ``_parse_decls``. This was one of the
two genuinely-shared utilities identified for extraction before the frozen
tree's deletion — every other caller of CSS-rule parsing under ``converter/``
already had its own extraction logic; only ``converter/entry.py``'s two
``convert_section``/``_convert_section_body`` call sites depended on the
frozen ``convert.parse_css``, so this module exists purely to give them a
non-frozen home. No behavioural change from the frozen original.
"""
from __future__ import annotations

import re

_RULE_RE = re.compile(r"([^{}]+)\{([^{}]+)\}", re.DOTALL)
_DECL_RE = re.compile(r"\s*([\w-]+)\s*:\s*([^;]+);?\s*", re.DOTALL)


def parse_css(css_text: str) -> dict[str, dict[str, str]]:
    """Parse CSS into {selector: {prop: value}}. Media queries flatten with marker.

    Uses brace-balanced scanner so nested @media blocks are extracted correctly.
    """
    rules: dict[str, dict[str, str]] = {}
    css_text = re.sub(r"/\*.*?\*/", "", css_text, flags=re.DOTALL)

    def _ingest_rules_text(text: str, media_cond: str = "") -> None:
        for inner in _RULE_RE.finditer(text):
            sel = inner.group(1).strip()
            decls = inner.group(2)
            if sel.startswith("@"):
                continue
            key = f"{media_cond} :: {sel}" if media_cond else sel
            rules.setdefault(key, {}).update(_parse_decls(decls))

    i = 0
    n = len(css_text)
    plain_start = 0
    while i < n:
        if css_text.startswith("@media", i):
            _ingest_rules_text(css_text[plain_start:i])
            brace_open = css_text.find("{", i)
            if brace_open == -1:
                break
            cond = css_text[i:brace_open].strip()
            depth = 1
            j = brace_open + 1
            while j < n and depth > 0:
                ch = css_text[j]
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                j += 1
            if depth != 0:
                break
            body = css_text[brace_open + 1: j - 1]
            _ingest_rules_text(body, media_cond=cond)
            i = j
            plain_start = j
            continue
        i += 1
    _ingest_rules_text(css_text[plain_start:])
    return rules


def _parse_decls(decl_text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in _DECL_RE.finditer(decl_text):
        prop = m.group(1).strip()
        val = m.group(2).strip()
        if prop and val:
            out[prop] = val
    return out
