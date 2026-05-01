"""Module 3 -- Recogniser (main entry point).

Orchestrates the per-section AI matching pipeline:

    1. Read mockup HTML.
    2. Run :func:`tools.recogniser.section_detector.detect_sections`.
    3. Load the fingerprint catalogue at ``data/fingerprints.json``.
    4. For each section, build a per-section prompt from
       ``prompts/recogniser-prompt.md`` (with a trimmed catalogue scoped
       to relevant fingerprints), shell out to the Claude CLI in
       ``--output-format json`` mode, parse the inner JSON match
       decision, and accumulate.
    5. Write a markdown summary plus a raw decisions JSON file under
       ``reports/``.

Subscription-only: this module never calls the Anthropic API directly --
all model invocations go via the ``claude`` CLI subprocess.

Spec: ``.claude/plans/recogniser-v1.md``  Module 3.

CLI:

    python tools/recogniser/recogniser.py \\
        --html sites/mamas-munches/mockups/homepage/index.html \\
        --variation mamas-munches \\
        --output reports/recogniser-run-2026-05-01.md
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Local import: section detector lives next to this file.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from section_detector import detect_sections  # noqa: E402

# ---------------------------------------------------------------------------
# Paths & constants
# ---------------------------------------------------------------------------

_THIS_DIR = Path(__file__).resolve().parent
_FINGERPRINTS_PATH = _THIS_DIR / "data" / "fingerprints.json"
_PROMPT_TEMPLATE_PATH = _THIS_DIR / "prompts" / "recogniser-prompt.md"

# Truncate per-section HTML before sending to the model. The downstream
# report uses the untruncated fragment.
_HTML_FRAGMENT_CAP = 8000

# Hard cap on retries per section before we record a deferred entry.
_MAX_RETRIES = 1

# How many consecutive failures cause a stop-condition exit.
_STOP_AFTER_CONSECUTIVE_FAILURES = 3

# Curated SGS short-list always included in the trimmed catalogue so the
# model has the most-likely candidates available even when class-overlap
# heuristics miss them.
_CURATED_SGS_BLOCKS = (
    "sgs/hero",
    "sgs/testimonial",
    "sgs/notice-banner",
    "sgs/icon-block",
    "sgs/feature-grid",
    "sgs/cta",
    "sgs/header",
    "sgs/footer",
)

# Claude CLI invocation timeout (seconds) per section.
_CLI_TIMEOUT = 180


# ---------------------------------------------------------------------------
# Catalogue helpers
# ---------------------------------------------------------------------------


def _load_fingerprints() -> dict[str, dict]:
    """Load the fingerprint catalogue or exit 2 if missing/invalid."""
    if not _FINGERPRINTS_PATH.exists():
        sys.stderr.write(
            f"ERROR: fingerprint catalogue not found at "
            f"{_FINGERPRINTS_PATH}. Run Module 2 (fingerprint_indexer.py) "
            "first.\n"
        )
        raise SystemExit(2)
    try:
        with _FINGERPRINTS_PATH.open(encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        sys.stderr.write(f"ERROR: cannot read fingerprints.json: {exc}\n")
        raise SystemExit(2)
    if not isinstance(data, dict) or not data:
        sys.stderr.write("ERROR: fingerprints.json is empty or wrong shape.\n")
        raise SystemExit(2)
    return data


def _trim_catalogue(
    full_catalogue: dict[str, dict],
    class_signature: list[str],
) -> dict[str, dict]:
    """Trim the catalogue to fingerprints relevant for this section.

    Selection rule:
        * Always include all ``core/*`` blocks (cheap fallback safety net).
        * Always include the curated SGS short-list.
        * Include any block whose ``required_html_pattern.class_includes_any``
          intersects ``class_signature``.

    If the resulting set is suspiciously small (fewer than 8 entries),
    fall back to the full catalogue so the model isn't starved of context.
    """
    sig_set = {c.lower() for c in class_signature}
    trimmed: dict[str, dict] = {}

    for name, entry in full_catalogue.items():
        if name.startswith("core/"):
            trimmed[name] = entry
            continue
        if name in _CURATED_SGS_BLOCKS:
            trimmed[name] = entry
            continue
        pattern = entry.get("required_html_pattern") or {}
        includes = pattern.get("class_includes_any") or []
        if any(c.lower() in sig_set for c in includes):
            trimmed[name] = entry

    if len(trimmed) < 8:
        return full_catalogue
    return trimmed


# ---------------------------------------------------------------------------
# Prompt assembly
# ---------------------------------------------------------------------------


def _load_prompt_template() -> str:
    """Read the cold-prompt template from disk."""
    return _PROMPT_TEMPLATE_PATH.read_text(encoding="utf-8")


def _build_prompt(
    template: str,
    section: dict,
    variation_slug: str,
    catalogue: dict[str, dict],
    *,
    strict_suffix: bool = False,
) -> tuple[str, bool]:
    """Fill the prompt template for a single section.

    Returns a tuple ``(prompt_text, truncated)`` where ``truncated`` is
    True when the HTML fragment was clipped.
    """
    fragment = section["html_fragment"]
    truncated = False
    if len(fragment) > _HTML_FRAGMENT_CAP:
        fragment = fragment[:_HTML_FRAGMENT_CAP] + "\n<!-- TRUNCATED -->"
        truncated = True

    filled = (
        template
        .replace("{section_id}", section["section_id"])
        .replace("{semantic_role}", section["semantic_role"])
        .replace("{html_fragment}", fragment)
        .replace(
            "{class_signature}",
            ", ".join(section["class_signature"]) or "(none)",
        )
        .replace("{variation_slug}", variation_slug)
        .replace(
            "{fingerprint_json}",
            json.dumps(catalogue, ensure_ascii=False),
        )
    )

    if strict_suffix:
        filled += (
            "\n\nOUTPUT VALID JSON ONLY. NO PRELUDE. NO MARKDOWN FENCES. "
            "ONE JSON OBJECT MATCHING THE SCHEMA.\n"
        )
    return filled, truncated


# ---------------------------------------------------------------------------
# Claude CLI invocation
# ---------------------------------------------------------------------------


def _strip_fences(text: str) -> str:
    """Remove leading/trailing markdown fences if present."""
    t = text.strip()
    if t.startswith("```"):
        # Drop the opening fence line.
        first_nl = t.find("\n")
        if first_nl != -1:
            t = t[first_nl + 1 :]
        if t.endswith("```"):
            t = t[: -3]
    return t.strip()


def _call_claude(prompt: str) -> tuple[bool, str, str]:
    """Run ``claude -p --print ... --output-format json``.

    Returns ``(ok, inner_text, error_message)``. ``ok=True`` means the
    CLI exited zero AND the envelope JSON was parsed. ``inner_text`` is
    the ``result`` field from the envelope (still needs to be parsed as
    the per-section JSON object by the caller).
    """
    try:
        proc = subprocess.run(
            [
                "claude",
                "-p",
                "--print",
                prompt,
                "--output-format",
                "json",
            ],
            capture_output=True,
            text=True,
            timeout=_CLI_TIMEOUT,
            encoding="utf-8",
        )
    except subprocess.TimeoutExpired:
        return False, "", "claude CLI timeout"
    except FileNotFoundError:
        return False, "", "claude CLI not found on PATH"

    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()[:400]
        return False, "", f"claude exit {proc.returncode}: {err}"

    raw = (proc.stdout or "").strip()
    if not raw:
        return False, "", "claude returned empty stdout"

    try:
        envelope = json.loads(raw)
    except json.JSONDecodeError as exc:
        return False, "", f"envelope JSON parse error: {exc}"

    # The CLI emits a stream of events as a JSON array. The final
    # ``{"type":"result", ..., "result":"<text>"}`` event carries the
    # model's reply. Older / simpler shapes return a single dict with
    # the same ``result`` key -- handle both.
    candidates: list = (
        envelope if isinstance(envelope, list) else [envelope]
    )
    last_result_text: str | None = None
    last_assistant_text: str | None = None
    for evt in candidates:
        if not isinstance(evt, dict):
            continue
        if evt.get("type") == "result":
            inner = evt.get("result")
            if isinstance(inner, str):
                last_result_text = inner
            elif isinstance(inner, dict):
                last_result_text = json.dumps(inner)
        elif evt.get("type") == "assistant":
            msg = evt.get("message") or {}
            content = msg.get("content")
            if isinstance(content, list):
                for block in content:
                    if (
                        isinstance(block, dict)
                        and block.get("type") == "text"
                        and isinstance(block.get("text"), str)
                    ):
                        last_assistant_text = block["text"]

    if last_result_text is not None:
        return True, last_result_text, ""
    if last_assistant_text is not None:
        return True, last_assistant_text, ""
    # Single-dict shape with top-level "result".
    if isinstance(envelope, dict):
        inner = envelope.get("result")
        if isinstance(inner, str):
            return True, inner, ""
        if isinstance(inner, dict):
            return True, json.dumps(inner), ""
    return False, "", "no result event found in CLI envelope"


def _parse_inner(inner_text: str) -> tuple[bool, dict, str]:
    """Parse the per-section JSON object from the model's reply."""
    cleaned = _strip_fences(inner_text)
    try:
        obj = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        # Try extracting the first {...} block as a salvage.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end > start:
            try:
                obj = json.loads(cleaned[start : end + 1])
                return True, obj, ""
            except json.JSONDecodeError:
                pass
        return False, {}, f"inner JSON parse error: {exc}"
    if not isinstance(obj, dict):
        return False, {}, "inner JSON was not an object"
    return True, obj, ""


# ---------------------------------------------------------------------------
# Per-section pipeline
# ---------------------------------------------------------------------------


def _decide_section(
    section: dict,
    variation: str,
    catalogue: dict[str, dict],
    template: str,
) -> tuple[dict, str | None]:
    """Run one section through the model.

    Returns ``(decision, error_or_none)``. On parse / CLI failure the
    decision is a synthesised ``deferred`` record so the report still
    has an entry for the section.
    """
    trimmed = _trim_catalogue(catalogue, section["class_signature"])

    for attempt in range(_MAX_RETRIES + 1):
        prompt, truncated = _build_prompt(
            template,
            section,
            variation,
            trimmed,
            strict_suffix=(attempt > 0),
        )
        ok, inner, err = _call_claude(prompt)
        if not ok:
            if attempt < _MAX_RETRIES:
                continue
            return _deferred_record(section, err, truncated), err

        parsed_ok, obj, parse_err = _parse_inner(inner)
        if parsed_ok:
            # Force section_id to match input even if model copied wrong.
            obj["section_id"] = section["section_id"]
            if truncated:
                match = obj.setdefault("match", {})
                attrs = match.setdefault("extracted_attrs", {})
                if isinstance(attrs, dict):
                    attrs.setdefault("_html_truncated", True)
            return obj, None

        if attempt < _MAX_RETRIES:
            continue
        return _deferred_record(section, parse_err, truncated), parse_err

    # Unreachable, but keep the type-checker happy.
    return _deferred_record(section, "unknown failure", False), "unknown"


def _deferred_record(
    section: dict, note: str, truncated: bool,
) -> dict:
    """Build a deferred fallback decision when the model fails."""
    attrs: dict = {
        "className": "sgs-deferred-recogniser-failure",
        "note": f"Recogniser parse error: {note}",
    }
    if truncated:
        attrs["_html_truncated"] = True
    return {
        "section_id": section["section_id"],
        "match": {
            "block_name": "core/group",
            "confidence": 0.0,
            "tier": "deferred",
            "extracted_attrs": attrs,
            "inner_blocks": [],
        },
    }


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


def _summarise(decisions: list[dict]) -> dict[str, int]:
    """Count match tiers across all decisions."""
    counts = {"full": 0, "partial": 0, "fallback": 0, "deferred": 0, "other": 0}
    for d in decisions:
        tier = (d.get("match") or {}).get("tier", "other")
        counts[tier if tier in counts else "other"] += 1
    return counts


def _write_markdown_report(
    out_path: Path,
    decisions: list[dict],
    sections: list[dict],
    variation: str,
    html_path: Path,
    prompt_tweaks: list[str],
) -> None:
    """Write the human-readable run report."""
    counts = _summarise(decisions)
    today = datetime.now().strftime("%Y-%m-%d")

    lines: list[str] = []
    lines.append(f"# Recogniser Run -- {variation} -- {today}")
    lines.append("")
    lines.append(f"- Source HTML: `{html_path}`")
    lines.append(f"- Sections: {len(sections)}")
    lines.append(f"- Variation: `{variation}`")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Full matches: {counts['full']}")
    lines.append(f"- Partial: {counts['partial']}")
    lines.append(f"- Fallback: {counts['fallback']}")
    lines.append(f"- Deferred: {counts['deferred']}")
    if counts["other"]:
        lines.append(f"- Other / unknown tier: {counts['other']}")
    lines.append("")
    if prompt_tweaks:
        lines.append("## Prompt template tweaks applied")
        lines.append("")
        for tweak in prompt_tweaks:
            lines.append(f"- {tweak}")
        lines.append("")
    lines.append("## Decisions")
    lines.append("")
    lines.append(
        "| section_id | semantic_role | block | tier | confidence | gap |"
    )
    lines.append(
        "|------------|---------------|-------|------|-----------:|-----|"
    )

    role_by_id = {s["section_id"]: s["semantic_role"] for s in sections}
    for d in decisions:
        sid = d.get("section_id", "?")
        match = d.get("match") or {}
        block = match.get("block_name", "?")
        tier = match.get("tier", "?")
        conf = match.get("confidence", 0.0)
        gap = match.get("gap")
        if isinstance(gap, dict):
            classification = gap.get("classification", "?")
            missing = ", ".join(gap.get("missing_features", []) or [])
            gap_cell = f"{classification}: {missing}" if missing else classification
        else:
            gap_cell = "--"
        try:
            conf_str = f"{float(conf):.2f}"
        except (TypeError, ValueError):
            conf_str = str(conf)
        lines.append(
            f"| {sid} | {role_by_id.get(sid, '?')} | {block} | {tier} | "
            f"{conf_str} | {gap_cell} |"
        )

    lines.append("")
    lines.append("## Per-section detail")
    lines.append("")
    for d in decisions:
        sid = d.get("section_id", "?")
        lines.append(f"### {sid}")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps(d, indent=2, ensure_ascii=False))
        lines.append("```")
        lines.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")


def _write_decisions_json(
    out_md_path: Path, decisions: list[dict],
) -> Path:
    """Write the raw decisions JSON next to the markdown report."""
    json_name = out_md_path.name.replace(
        "recogniser-run-", "recogniser-decisions-"
    )
    if json_name == out_md_path.name:
        json_name = out_md_path.stem + "-decisions.json"
    elif json_name.endswith(".md"):
        json_name = json_name[: -3] + ".json"
    json_path = out_md_path.parent / json_name
    json_path.write_text(
        json.dumps(decisions, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return json_path


def _write_blockers(
    repo_root: Path, message: str,
) -> Path:
    """Append a stop-condition blocker entry."""
    blockers = repo_root / "reports" / "recogniser-v1-blockers.md"
    blockers.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with blockers.open("a", encoding="utf-8") as fh:
        fh.write(f"\n## Blocker -- {stamp}\n\n{message}\n")
    return blockers


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="SGS Recogniser -- match HTML sections to SGS/core blocks.",
    )
    parser.add_argument(
        "--html",
        required=True,
        type=Path,
        help="Path to the mockup HTML file.",
    )
    parser.add_argument(
        "--variation",
        required=True,
        help="Active style variation slug (e.g. mamas-munches).",
    )
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Path to the markdown report to write.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """CLI entry point."""
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):  # pragma: no cover
        pass

    args = _parse_args(argv)

    if not args.html.exists():
        sys.stderr.write(f"ERROR: HTML file not found: {args.html}\n")
        return 2
    try:
        html = args.html.read_text(encoding="utf-8")
    except OSError as exc:
        sys.stderr.write(f"ERROR: cannot read {args.html}: {exc}\n")
        return 2

    try:
        sections = detect_sections(html)
    except Exception as exc:  # noqa: BLE001 -- mockup parse is a stop condition
        repo_root = Path(__file__).resolve().parents[2]
        _write_blockers(
            repo_root,
            f"Mockup HTML failed to parse: {exc}\nFile: {args.html}",
        )
        sys.stderr.write(f"ERROR: section detector failed: {exc}\n")
        return 3

    if not sections:
        sys.stderr.write("ERROR: no sections detected in HTML.\n")
        return 3

    catalogue = _load_fingerprints()
    template = _load_prompt_template()

    sys.stderr.write(
        f"recogniser: {len(sections)} sections, "
        f"{len(catalogue)} fingerprints, variation={args.variation}\n"
    )

    decisions: list[dict] = []
    consecutive_failures = 0
    total = len(sections)

    for idx, section in enumerate(sections, start=1):
        decision, err = _decide_section(
            section, args.variation, catalogue, template,
        )
        decisions.append(decision)

        match = decision.get("match") or {}
        tier = match.get("tier", "?")
        block = match.get("block_name", "?")
        try:
            conf = float(match.get("confidence", 0.0))
        except (TypeError, ValueError):
            conf = 0.0
        sys.stderr.write(
            f"[{idx}/{total}] {section['section_id']} -- "
            f"{tier} ({block}, {conf:.2f})"
            + (f"  err={err}" if err else "")
            + "\n"
        )

        if err is not None:
            consecutive_failures += 1
        else:
            consecutive_failures = 0

        if consecutive_failures >= _STOP_AFTER_CONSECUTIVE_FAILURES:
            repo_root = Path(__file__).resolve().parents[2]
            _write_blockers(
                repo_root,
                "Stop condition: 3+ consecutive Claude CLI failures.\n"
                f"Last error: {err}\n"
                f"Sections processed: {idx}/{total}",
            )
            sys.stderr.write(
                "STOP: 3+ consecutive failures, see "
                "reports/recogniser-v1-blockers.md\n"
            )
            # Still write what we have so partial state is recoverable.
            _write_markdown_report(
                args.output, decisions, sections,
                args.variation, args.html, [],
            )
            _write_decisions_json(args.output, decisions)
            return 4

    prompt_tweaks = [
        "Added 'raw mockup, not WP-rendered' header so missing SGS class "
        "names don't downgrade matches to partial.",
        "Strengthened SGS-vs-core preference rule: match by semantic role "
        "first (header/hero/feature-grid/testimonial/notice-banner/footer), "
        "with class fingerprints as a hint not a requirement.",
        "Tightened deferred-tier definition: only sections with explicit "
        "ecom content (price+currency, add-to-cart, variant selector) "
        "qualify; generic product-CTA sections fall back to sgs/cta or core.",
        "Added quick-reference SGS block list inline so the model has a "
        "concrete shortlist to choose from on every section.",
    ]
    _write_markdown_report(
        args.output, decisions, sections,
        args.variation, args.html, prompt_tweaks,
    )
    json_path = _write_decisions_json(args.output, decisions)

    counts = _summarise(decisions)
    sys.stderr.write(
        f"recogniser: done. full={counts['full']} "
        f"partial={counts['partial']} fallback={counts['fallback']} "
        f"deferred={counts['deferred']}\n"
    )
    sys.stderr.write(f"  report:   {args.output}\n")
    sys.stderr.write(f"  decisions: {json_path}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
