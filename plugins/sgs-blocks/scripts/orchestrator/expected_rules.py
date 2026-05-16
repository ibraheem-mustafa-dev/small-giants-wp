#!/usr/bin/env python3
"""expected_rules.py -- Per-section CSS rule baseline for Phase 9 walkdown.

Writes ``<run_dir>/expected-rules-<boundary>.jsonl`` listing every CSS rule
whose selector targets into the section's DOM subtree. Stage 2 of the v3
pre-work plan (2026-05-17): the diff ``expected ∖ walker_seen`` exposes the
silent misses that yesterday's @media regex bug would have hidden, because
the walker emits zero trace events for rules it never reaches.

Schema per JSONL line:
    {
        "selector": "<original selector incl. pseudo>",
        "declarations": {"<prop>": "<value>", ...},
        "source_media_condition": "<@media cond>" | null
    }

Why parse_css from convert.py rather than cssutils:
    cssutils is not installed in the dev/CI environment and adding a runtime
    dep for tracing-only infrastructure is the wrong shape. The in-tree
    parse_css() is the proven production parser (the same one that got the
    @media regex fix yesterday, commit 20ef1d66); reusing it means the
    baseline reflects exactly what the converter sees -- not a different
    parser's interpretation, which would introduce its own silent-miss class.

Selector matching: soupsieve (already a bs4 dependency). Selectors that
soupsieve cannot parse (e.g. some ``:not()`` forms, pseudo-states like
``:hover``) are still recorded, but matched against the section by first
stripping the pseudo-element/state suffix. Unmatched-by-soupsieve rules are
INCLUDED when their stripped form matches -- conservative bias toward keeping
candidate rules visible in the baseline rather than dropping them.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Tag

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Reuse the in-tree CSS parser.
try:
    from .converter_v2 import convert as _v3
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    from converter_v2 import convert as _v3  # type: ignore[no-redef]


# Pseudo bits we strip before handing the selector to soupsieve. Order matters
# (longer first) so ``::before`` is stripped before ``:before``.
_PSEUDO_RE = re.compile(
    r"(::?(?:before|after|first-letter|first-line|placeholder|marker|selection|"
    r"hover|focus|focus-visible|focus-within|active|visited|link|target|"
    r"disabled|enabled|checked|empty|root|"
    r"nth-child\([^)]*\)|nth-of-type\([^)]*\)|"
    r"first-child|last-child|first-of-type|last-of-type|"
    r"is\([^)]*\)|where\([^)]*\)|not\([^)]*\)))+",
    re.IGNORECASE,
)


def _strip_pseudo(selector: str) -> str:
    """Remove pseudo-elements and pseudo-states so soupsieve can attempt a match."""
    return _PSEUDO_RE.sub("", selector).strip()


def _split_parsed_key(key: str) -> tuple[str | None, str]:
    """parse_css() flattens @media into ``"<cond> :: <selector>"``. Split it back."""
    if " :: " in key:
        cond, sel = key.split(" :: ", 1)
        return cond.strip(), sel.strip()
    return None, key.strip()


def _selector_matches_subtree(section_root: Tag, selector: str) -> bool:
    """Does this CSS selector match any element in section_root's subtree?

    Comma-separated selectors are tested part-by-part; ANY match wins.
    Unparseable selectors fall back to a substring class-name probe so they
    aren't silently dropped from the baseline.
    """
    for part in selector.split(","):
        part = part.strip()
        if not part:
            continue
        stripped = _strip_pseudo(part) or part
        try:
            if section_root.select(stripped, limit=1):
                return True
        except (NotImplementedError, ValueError, Exception):  # noqa: BLE001
            # soupsieve couldn't parse the selector. Fall back to a coarse
            # class-name probe: pull each ``.class-name`` token and check
            # whether any node in the subtree carries it.
            cls_tokens = re.findall(r"\.([A-Za-z][\w-]*)", stripped)
            for tok in cls_tokens:
                if section_root.find(class_=tok):
                    return True
    return False


def extract_for_section(section_html: str, full_css: str) -> list[dict]:
    """Return the list of expected-rule dicts for one section.

    Parameters
    ----------
    section_html:
        Outer HTML of the section element (single root).
    full_css:
        Full inline-stylesheet text from the mockup (all <style> blocks
        concatenated).
    """
    soup = BeautifulSoup(section_html, "html.parser")
    root = soup.find()
    if root is None:
        return []

    parsed = _v3.parse_css(full_css or "")
    out: list[dict] = []
    for key, decls in parsed.items():
        media_cond, selector = _split_parsed_key(key)
        if not _selector_matches_subtree(root, selector):
            continue
        out.append({
            "selector": selector,
            "declarations": dict(decls),
            "source_media_condition": media_cond,
        })
    return out


def write_baseline(section_html: str, full_css: str,
                   run_dir: Path | str, boundary_id: str) -> Path:
    """Write expected-rules-<boundary>.jsonl. Returns the written path.

    boundary_id is sanitised the same way as Trace.for_boundary() so trace +
    baseline files share a filename suffix.
    """
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", boundary_id or "unknown")
    out_path = Path(run_dir) / f"expected-rules-{safe}.jsonl"
    rules = extract_for_section(section_html, full_css)
    with open(out_path, "w", encoding="utf-8") as fh:
        for row in rules:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return out_path


# ----------------------------------------------------------------------------
# CLI: standalone use during debugging walkdown
# ----------------------------------------------------------------------------

def _cli() -> int:
    import argparse
    parser = argparse.ArgumentParser(
        description="Write expected-rules baseline for one section.",
    )
    parser.add_argument("--mockup", required=True, type=Path,
                        help="Full mockup HTML file (contains <style> blocks).")
    parser.add_argument("--section-selector", required=True,
                        help='CSS selector for the section, e.g. "section.sgs-brand".')
    parser.add_argument("--out-dir", required=True, type=Path,
                        help="Run directory (file written as expected-rules-<boundary>.jsonl).")
    parser.add_argument("--boundary-id", required=True,
                        help="Boundary tag used in the output filename.")
    args = parser.parse_args()

    mockup_html = args.mockup.read_text(encoding="utf-8")
    soup = BeautifulSoup(mockup_html, "html.parser")

    full_css = "\n\n".join(t.get_text() for t in soup.find_all("style"))

    # Resolve the section element via soupsieve so multi-class and descendant
    # selectors work correctly. Sonnet adversarial QC finding 2026-05-17: the
    # earlier hand-rolled `tag + first-class-token` split silently matched the
    # wrong element when the operator passed a compound selector like
    # `section.sgs-brand.sgs-brand--alt` — only the first class was honoured,
    # so a variant earlier in the HTML would mask the intended target.
    matches = soup.select(args.section_selector, limit=1)
    sec_el = matches[0] if matches else None
    if sec_el is None:
        sys.stderr.write(f"No element matched section selector: {args.section_selector}\n")
        return 2

    args.out_dir.mkdir(parents=True, exist_ok=True)
    out_path = write_baseline(str(sec_el), full_css, args.out_dir, args.boundary_id)
    rules = extract_for_section(str(sec_el), full_css)
    sys.stdout.write(f"Wrote {out_path} ({len(rules)} rules)\n")
    return 0


if __name__ == "__main__":
    sys.exit(_cli())
