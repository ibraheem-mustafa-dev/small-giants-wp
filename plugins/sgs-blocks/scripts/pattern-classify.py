#!/usr/bin/env python3
"""
SGS Pattern Classifier
======================
2026-05-06 — part of /sgs-clone pipeline Stage 4

Classifies captured HTML patterns across six dimensions for the SGS pattern library:
  - category      : semantic section type (hero, footer, FAQ, etc.)
  - industry      : target vertical (food, healthcare, retail, etc.)
  - mood          : visual/emotional register (warm-friendly, premium-minimal, etc.)
  - style         : aesthetic family (classic, modern, brutalist, etc.)
  - content_shape : DOM-derived layout shape (deterministic)
  - block_composition : suggested SGS block slugs (deterministic heuristic)
  - confidence    : per-dimension confidence scores (category / industry / mood / style)

Usage:
    python pattern-classify.py <html-file> [--css-file <path>] [--auto] [--industry <hint>] [--output <json>]

Options:
    --auto          Skip LLM judgement, return safe defaults (useful for batch pipelines)
    --industry      Industry hint passed to LLM (e.g. "food")
    --css-file      Path to a JSON file of CSS custom property name→value pairs
    --output        Write result JSON to this path instead of stdout
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import subprocess
import sys
import textwrap
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Ensure stdout handles unicode (Windows cmd.exe quirk)
# ---------------------------------------------------------------------------
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

try:
    from bs4 import BeautifulSoup, Tag
except ImportError:
    print(
        "ERROR: beautifulsoup4 is required. Install with: pip install beautifulsoup4",
        file=sys.stderr,
    )
    sys.exit(1)

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Enum constants
# ---------------------------------------------------------------------------
VALID_CATEGORIES = {
    "hero", "footer", "trust-bar", "FAQ", "contact", "pricing-table",
    "testimonial-grid", "cta-banner", "gallery", "team-grid", "stats-strip",
    "process-steps", "mega-menu", "breadcrumbs", "generic",
}
VALID_INDUSTRIES = {
    "food", "healthcare", "retail", "professional-services", "construction",
    "education", "nonprofit", "tech-saas", "hospitality", "wholesale", "agnostic",
}
VALID_MOODS = {
    "warm-friendly", "premium-minimal", "editorial-content-heavy",
    "brutalist", "corporate-clean", "playful-illustrated", "dark-luxe",
}
VALID_STYLES = {
    "classic", "modern", "brutalist", "glassmorphism",
    "neumorphism", "swiss-grid", "magazine",
}
VALID_CONTENT_SHAPES = {
    "single-column", "split", "grid", "tabs",
    "accordion", "carousel", "vertical-timeline",
}

# Defaults used when auto=True or LLM is unavailable
SAFE_DEFAULTS: dict[str, Any] = {
    "category": "generic",
    "industry": "agnostic",
    "mood": "neutral",
    "style": "classic",
    "confidence": {"category": 0.5, "industry": 0.5, "mood": 0.5, "style": 0.5},
}

# Path the spec says to check for the Gemini Flash CLI
GEMINI_FLASH_PATH = Path.home() / ".claude" / "hooks" / "gemini-flash.py"


# ---------------------------------------------------------------------------
# Deterministic: content_shape
# ---------------------------------------------------------------------------

def _classes(tag: Tag) -> set[str]:
    """Return the normalised class set for a BeautifulSoup tag."""
    return set(tag.get("class") or [])


def _has_class_pattern(tag: Tag, pattern: str) -> bool:
    return any(re.search(pattern, c, re.IGNORECASE) for c in _classes(tag))


def _is_block_level(tag: Tag) -> bool:
    block_tags = {
        "div", "section", "article", "aside", "nav", "header", "footer",
        "main", "figure", "p", "ul", "ol", "li", "details", "summary",
        "h1", "h2", "h3", "h4", "h5", "h6", "form", "fieldset",
    }
    return tag.name in block_tags


def _child_block_elements(tag: Tag) -> list[Tag]:
    """Return direct children that are block-level elements."""
    return [c for c in tag.children if isinstance(c, Tag) and _is_block_level(c)]


def _similar_shape(children: list[Tag]) -> bool:
    """
    Check if a list of siblings share a similar structural signature,
    which suggests a repeating grid/card pattern.
    """
    if len(children) < 2:
        return False
    # Build a simple signature: (tag_name, child_count)
    sigs = [(c.name, len(list(c.children))) for c in children]
    first = sigs[0]
    # Require at least 75 % of children to share the same tag
    same_tag = sum(1 for s in sigs if s[0] == first[0])
    return same_tag / len(sigs) >= 0.75


def derive_content_shape(soup: BeautifulSoup) -> str:
    """
    Walk the DOM deterministically and return a content_shape label.

    Priority (first match wins):
      tabs → accordion → carousel → vertical-timeline → grid → split → single-column
    """
    # Find the outermost meaningful block element
    root = (
        soup.find("section")
        or soup.find("article")
        or soup.find("header")
        or soup.find("footer")
        or (soup.body and soup.body)
        or soup
    )
    # Fall back to body or the soup root itself
    if not isinstance(root, Tag):
        return "single-column"

    children = _child_block_elements(root)

    # --- tabs ---
    if any(
        tag.get("role") == "tabpanel" or _has_class_pattern(tag, r"^tab")
        for tag in soup.find_all(True)
    ):
        return "tabs"

    # --- accordion ---
    if soup.find("details") or any(
        _has_class_pattern(tag, r"accordion")
        for tag in soup.find_all(True)
    ):
        return "accordion"

    # --- carousel ---
    if any(
        _has_class_pattern(tag, r"carousel|slider|swiper")
        for tag in soup.find_all(True)
    ):
        return "carousel"

    # --- vertical-timeline ---
    # Ordered list with many items, or explicit timeline class
    if any(
        _has_class_pattern(tag, r"timeline")
        for tag in soup.find_all(True)
    ):
        return "vertical-timeline"
    all_ols = soup.find_all("ol")
    if any(len(ol.find_all("li")) >= 3 for ol in all_ols):
        return "vertical-timeline"

    # --- grid / split / single-column based on direct children ---
    if not children:
        return "single-column"

    child_count = len(children)

    if child_count == 1:
        return "single-column"

    if child_count == 2 and all(_is_block_level(c) for c in children):
        return "split"

    if 3 <= child_count <= 6 and _similar_shape(children):
        return "grid"

    return "single-column"


# ---------------------------------------------------------------------------
# Deterministic: block_composition
# ---------------------------------------------------------------------------

def _any_class(soup: BeautifulSoup, pattern: str) -> bool:
    return bool(
        soup.find(lambda t: isinstance(t, Tag) and _has_class_pattern(t, pattern))
    )


def derive_block_composition(soup: BeautifulSoup) -> list[str]:
    """
    Map common HTML signatures to SGS block slugs via deterministic heuristics.
    Returns a deduplicated list ordered by confidence (highest first).
    """
    suggestions: list[str] = []

    # --- sgs/hero ---
    has_h1 = bool(soup.find("h1"))
    has_p = bool(soup.find("p"))
    has_cta_link = bool(
        soup.find("a", class_=re.compile(r"btn|cta", re.IGNORECASE))
        or soup.find("a", attrs={"class": lambda v: v and any(
            re.search(r"btn|cta", c, re.IGNORECASE) for c in (v if isinstance(v, list) else [v])
        )})
    )
    if has_h1 and has_p and has_cta_link:
        suggestions.append("sgs/hero")

    # --- sgs/footer ---
    if soup.find("footer") or _any_class(soup, r"footer"):
        suggestions.append("sgs/footer")

    # --- sgs/cta-section ---
    if _any_class(soup, r"^cta"):
        suggestions.append("sgs/cta-section")

    # --- sgs/accordion ---
    if soup.find("details") or _any_class(soup, r"faq|accordion"):
        suggestions.append("sgs/accordion")

    # --- sgs/testimonial ---
    if soup.find("blockquote") or _any_class(soup, r"testimonial"):
        suggestions.append("sgs/testimonial")

    # --- sgs/form ---
    if soup.find("form"):
        suggestions.append("sgs/form")

    # --- sgs/card-grid  (image + heading + paragraph clusters) ---
    # Look for 2+ sibling containers each with img + heading + p
    def _is_card(tag: Tag) -> bool:
        return (
            bool(tag.find("img"))
            and bool(tag.find(re.compile(r"^h[2-6]$")))
            and bool(tag.find("p"))
        )

    card_candidates = [
        t for t in soup.find_all(True) if _is_card(t)
    ]
    if len(card_candidates) >= 2:
        suggestions.append("sgs/card-grid")

    # --- sgs/brand-strip (ul of small images) ---
    for ul in soup.find_all("ul"):
        imgs = ul.find_all("img")
        if len(imgs) >= 3:
            suggestions.append("sgs/brand-strip")
            break

    # --- sgs/button (standalone button without form context) ---
    standalone_buttons = [
        b for b in soup.find_all("button")
        if not b.find_parent("form")
    ]
    if standalone_buttons:
        suggestions.append("sgs/button")

    # Deduplicate while preserving insertion order
    seen: set[str] = set()
    result: list[str] = []
    for slug in suggestions:
        if slug not in seen:
            seen.add(slug)
            result.append(slug)

    return result


# ---------------------------------------------------------------------------
# LLM judgement: category / industry / mood / style
# ---------------------------------------------------------------------------

def _abbreviate_html(html: str, max_chars: int = 2000) -> str:
    """Return an abbreviated version of the HTML suitable for an LLM prompt."""
    # Strip script/style blocks to reduce noise
    cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) <= max_chars:
        return cleaned
    half = max_chars // 2
    return cleaned[:half] + "\n...[truncated]...\n" + cleaned[-half:]


def _summarise_css_vars(css_vars: dict[str, str] | None) -> str:
    if not css_vars:
        return "(none)"
    # Sort and limit to 30 entries to keep the prompt small
    items = sorted(css_vars.items())[:30]
    return "; ".join(f"{k}: {v}" for k, v in items)


def _build_gemini_prompt(html: str, css_vars: dict[str, str] | None, industry_hint: str | None) -> str:
    return textwrap.dedent(f"""
        Classify this captured web pattern for the SGS pattern library.
        HTML structure (abbreviated, max 2000 chars): {_abbreviate_html(html)}
        CSS variables used (sorted): {_summarise_css_vars(css_vars)}
        Industry hint (may be wrong): {industry_hint or "none"}

        Return strictly JSON with no markdown fences:
        {{
          "category": "<one of: hero, footer, trust-bar, FAQ, contact, pricing-table, testimonial-grid, cta-banner, gallery, team-grid, stats-strip, process-steps, mega-menu, breadcrumbs, generic>",
          "industry": "<one of: food, healthcare, retail, professional-services, construction, education, nonprofit, tech-saas, hospitality, wholesale, agnostic>",
          "mood": "<one of: warm-friendly, premium-minimal, editorial-content-heavy, brutalist, corporate-clean, playful-illustrated, dark-luxe>",
          "style": "<one of: classic, modern, brutalist, glassmorphism, neumorphism, swiss-grid, magazine>",
          "confidence": {{"category": 0.0-1.0, "industry": 0.0-1.0, "mood": 0.0-1.0, "style": 0.0-1.0}}
        }}
    """).strip()


def _validate_llm_result(data: dict) -> dict:
    """
    Validate the parsed LLM JSON against enum lists.
    Falls back to safe defaults for any invalid field.
    Logs warnings to stderr.
    """
    result = dict(SAFE_DEFAULTS)  # start from defaults

    for field, valid_set in [
        ("category", VALID_CATEGORIES),
        ("industry", VALID_INDUSTRIES),
        ("mood", VALID_MOODS),
        ("style", VALID_STYLES),
    ]:
        val = data.get(field, "")
        if val in valid_set:
            result[field] = val
        else:
            log.warning(
                "LLM returned invalid %s=%r — using default %r",
                field, val, result[field],
            )

    # Validate confidence sub-dict
    raw_conf = data.get("confidence", {})
    if isinstance(raw_conf, dict):
        validated_conf: dict[str, float] = {}
        for dim in ("category", "industry", "mood", "style"):
            raw_val = raw_conf.get(dim, 0.5)
            try:
                clamped = max(0.0, min(1.0, float(raw_val)))
            except (TypeError, ValueError):
                clamped = 0.5
            validated_conf[dim] = round(clamped, 3)
        result["confidence"] = validated_conf

    return result


def _call_gemini_flash(prompt: str) -> dict | None:
    """
    Attempt to call the Gemini Flash CLI at GEMINI_FLASH_PATH.
    Returns parsed dict on success, None on failure (caller falls back to defaults).
    """
    if not GEMINI_FLASH_PATH.exists():
        log.warning("Gemini Flash CLI not found at %s — using auto defaults", GEMINI_FLASH_PATH)
        return None

    try:
        proc = subprocess.run(
            [sys.executable, str(GEMINI_FLASH_PATH), "--prompt", prompt],
            capture_output=True,
            text=True,
            timeout=60,
            encoding="utf-8",
        )
        if proc.returncode != 0:
            log.warning(
                "gemini-flash.py exited %d: %s",
                proc.returncode,
                proc.stderr.strip()[:200],
            )
            return None

        output = proc.stdout.strip()
        # Strip optional markdown code fences
        output = re.sub(r"^```(?:json)?\s*|\s*```$", "", output, flags=re.DOTALL).strip()
        return json.loads(output)

    except subprocess.TimeoutExpired:
        log.warning("gemini-flash.py timed out after 60 s — using auto defaults")
    except json.JSONDecodeError as exc:
        log.warning("gemini-flash.py returned malformed JSON (%s) — using auto defaults", exc)
    except Exception as exc:  # noqa: BLE001
        log.warning("gemini-flash.py call failed (%s) — using auto defaults", exc)

    return None


def llm_classify(
    html: str,
    css_vars: dict[str, str] | None,
    industry_hint: str | None,
) -> dict:
    """
    Run LLM classification. Falls back to safe defaults if unavailable.
    Returns only the LLM-derived keys (category, industry, mood, style, confidence).
    """
    prompt = _build_gemini_prompt(html, css_vars, industry_hint)
    raw = _call_gemini_flash(prompt)

    if raw is None:
        log.warning("LLM unavailable — returning safe defaults for LLM-derived fields")
        return dict(SAFE_DEFAULTS)

    return _validate_llm_result(raw)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_pattern(
    html: str,
    css_vars: dict[str, str] | None = None,
    auto: bool = False,
    industry_hint: str | None = None,
) -> dict:
    """
    Classify a captured HTML pattern across six dimensions.

    Parameters
    ----------
    html:
        Raw HTML string of the captured pattern.
    css_vars:
        Optional mapping of CSS custom property names to their resolved values
        (e.g. {"--primary": "#0F7E80"}). Used as additional context for LLM.
    auto:
        When True, skip LLM judgement and return safe defaults for the four
        subjective dimensions (category, industry, mood, style). Deterministic
        dimensions (content_shape, block_composition) are always computed.
    industry_hint:
        Optional hint for the LLM about the target industry (e.g. "food").
        Ignored when auto=True.

    Returns
    -------
    dict with keys:
        category, industry, mood, style, content_shape, block_composition, confidence
    """
    soup = BeautifulSoup(html, "html.parser")

    # Deterministic dimensions — always computed
    content_shape = derive_content_shape(soup)
    block_composition = derive_block_composition(soup)

    if auto:
        llm_fields = dict(SAFE_DEFAULTS)
    else:
        llm_fields = llm_classify(html, css_vars, industry_hint)

    return {
        "category": llm_fields["category"],
        "industry": llm_fields["industry"],
        "mood": llm_fields["mood"],
        "style": llm_fields["style"],
        "content_shape": content_shape,
        "block_composition": block_composition,
        "confidence": llm_fields["confidence"],
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="SGS Pattern Classifier — Stage 4 of /sgs-clone pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "html_file",
        help="Path to the HTML file of the captured pattern",
    )
    parser.add_argument(
        "--css-file",
        dest="css_file",
        help="Path to a JSON file mapping CSS custom property names to values",
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        help="Skip LLM judgement and return safe defaults for subjective dimensions",
    )
    parser.add_argument(
        "--industry",
        dest="industry",
        default=None,
        help="Industry hint passed to the LLM (e.g. 'food')",
    )
    parser.add_argument(
        "--output",
        dest="output",
        default=None,
        help="Write JSON result to this file path instead of stdout",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = _parse_args(argv)

    html_path = Path(args.html_file)
    if not html_path.exists():
        print(f"ERROR: HTML file not found: {html_path}", file=sys.stderr)
        sys.exit(1)

    html = html_path.read_text(encoding="utf-8")

    css_vars: dict[str, str] | None = None
    if args.css_file:
        css_path = Path(args.css_file)
        if not css_path.exists():
            print(f"ERROR: CSS file not found: {css_path}", file=sys.stderr)
            sys.exit(1)
        try:
            css_vars = json.loads(css_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"ERROR: Could not parse CSS file as JSON: {exc}", file=sys.stderr)
            sys.exit(1)

    result = classify_pattern(
        html=html,
        css_vars=css_vars,
        auto=args.auto,
        industry_hint=args.industry,
    )

    output_json = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output_json, encoding="utf-8")
        print(f"Result written to {output_path}", file=sys.stderr)
    else:
        print(output_json)


# ---------------------------------------------------------------------------
# Smoke test — validates deterministic parts only
# ---------------------------------------------------------------------------

def validate_capture() -> None:
    """
    Hardcoded hero-shaped fixture.  Asserts that:
      - content_shape is derived correctly
      - block_composition includes expected SGS slugs
    Raises AssertionError on failure, prints pass message on success.
    """
    FIXTURE_HTML = """
    <section class="hero-section">
      <div class="hero-content">
        <h1>Welcome to Our Food Store</h1>
        <p>Fresh ingredients delivered to your door. Trusted by 5,000+ customers.</p>
        <a href="/shop" class="btn-primary cta">Shop Now</a>
      </div>
      <div class="hero-image">
        <img src="hero.jpg" alt="Fresh food">
      </div>
    </section>
    """

    result = classify_pattern(html=FIXTURE_HTML, auto=True)

    # --- content_shape: two direct children of <section> → "split" ---
    assert result["content_shape"] == "split", (
        f"Expected content_shape='split', got {result['content_shape']!r}"
    )

    # --- block_composition: should include sgs/hero (h1 + p + cta link) ---
    assert "sgs/hero" in result["block_composition"], (
        f"Expected 'sgs/hero' in block_composition, got {result['block_composition']}"
    )

    # --- auto mode returns safe defaults ---
    assert result["category"] == "generic", (
        f"Expected category='generic' in auto mode, got {result['category']!r}"
    )
    assert result["confidence"]["category"] == 0.5, (
        f"Expected confidence.category=0.5 in auto mode, got {result['confidence']['category']}"
    )

    print("validate_capture: PASS")
    print(json.dumps(result, indent=2, ensure_ascii=False))


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Running as CLI tool
    main()
