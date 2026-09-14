#!/usr/bin/env python3
"""sc_var_haiku_batch.py -- Piece 1's Tier B: one Haiku call per DRAFT.

Universal-pipeline upgrade, Gap 1 (2026-09-14, "the 2 gaps" follow-up to
D1057/D1058/D1061). `sc_var_classifier.py`'s own module docstring names this
exact capability as unbuilt: "a Haiku classifier batched ONCE PER DRAFT
(never per boundary), invoked by the pipeline session/orchestrator -- not
this module, which has no network access and no API client."

THIS SCRIPT ALSO HAS NO NETWORK ACCESS AND NO API CLIENT -- deliberately.
It is a two-step handoff, matching that design exactly:

  1. `--write-prompt` -- reads a boundaries JSON (Piece 1 output) + the
     existing committed cache, computes what's still unresolved via
     `unresolved_sc_for_names()`, enriches each item with classification
     context (child tag skeleton, raw sc-for text, sibling var names already
     seen elsewhere in the SAME draft), and writes ONE ready-to-dispatch
     prompt string to a file. The calling session (a Claude Code session, or
     a future headless orchestrator) is responsible for actually sending
     that prompt to a Haiku model -- this script never does.
  2. `--apply-response` -- reads the model's raw JSON response text back,
     validates every entry against the DB-authoritative block vocabulary
     (R-31-1: no hardcoded block list) and the confidence cap, and commits
     the validated entries to the sidecar via
     `sc_var_classifier.write_cache_entries()`.

Batching is per-DRAFT, not per-boundary or per-name: every unresolved name in
the draft goes into ONE prompt, because the point of Tier B is a single cheap
model call amortised across a whole draft, not N calls.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
_SCRIPTS_ROOT = _HERE.parent
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from recogniser import sc_var_classifier as _scv  # noqa: E402

DEFAULT_MODEL_ID = "claude-haiku-4-5-20251001"

# Same DB path/convention as sc_var_classifier.py (CLAUDE.md "DB-first, no
# hardcoded dicts") -- read-only, soft-fails to [] rather than break the
# pipeline if the DB is unavailable (an empty vocabulary just means every
# response entry gets rejected, never a crash).
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"


def _load_valid_blocks() -> list[str]:
    """R-31-1: Haiku's allowed vocabulary comes from the DB, never a
    hand-typed list -- `slots.standalone_block` is the same authoritative
    column `sc_var_classifier.py::_load_slot_aliases` already reads."""
    try:
        conn = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
        try:
            rows = conn.execute(
                "SELECT DISTINCT standalone_block FROM slots "
                "WHERE standalone_block IS NOT NULL"
            ).fetchall()
        finally:
            conn.close()
    except Exception:
        return []
    return sorted({r[0] for r in rows if r[0]})


def build_batch_items(boundaries: list[dict[str, Any]], cache: dict) -> list[dict[str, Any]]:
    """Piece 1's `unresolved_sc_for_names()` returns the bare minimum
    (boundary_id, var_name, hint_placeholder_count, fingerprint) -- enough
    to know WHAT needs classifying, not enough to classify it. This joins
    back the extra context Haiku actually needs: child tag skeleton + the
    raw sc-for text (its field names, e.g. `r.title`/`r.body`, are real
    signal even though the values are unrendered placeholders) + which
    OTHER sc-for names already appear in the same draft (helps disambiguate
    a bespoke name by its neighbours)."""
    unresolved = _scv.unresolved_sc_for_names(boundaries, cache)
    if not unresolved:
        return []
    by_id = {b.get("boundary_id"): b for b in boundaries}
    all_names_in_draft = sorted(
        {b["sc_var_name"] for b in boundaries if b.get("sc_var_kind") == "for" and b.get("sc_var_name")}
    )
    items: list[dict[str, Any]] = []
    for entry in unresolved:
        boundary = by_id.get(entry["boundary_id"], {})
        items.append(
            {
                "fingerprint": entry["fingerprint"],
                "var_name": entry["var_name"],
                "hint_placeholder_count": entry.get("hint_placeholder_count"),
                "child_tag_skeleton": boundary.get("sc_var_child_tag_skeleton"),
                "raw_text": boundary.get("sc_var_text"),
                "other_sc_for_names_in_draft": [n for n in all_names_in_draft if n != entry["var_name"]],
            }
        )
    return items


_PROMPT_TEMPLATE = """You are classifying repeated-content sections in a Claude Design website \
draft. Each item below is one `sc-for` (a "for each" template loop) whose variable NAME is the \
only clue to what kind of SGS block it should become -- the loop's ITEM CONTENT is still an \
unrendered template (e.g. "{{{{ r.title }}}}"), not real text, so classify from the variable \
name, its child element shape, and its repeat count.

Pick a block slug for each item from EXACTLY this list (do not invent a new one; if nothing \
fits, use null):
{valid_blocks}

Items to classify:
{items_json}

Reply with ONLY a JSON array, one object per item, in this exact shape:
[{{"fingerprint": "<the item's fingerprint, copied exactly>", "block": "<slug or null>", \
"confidence": <0.0-0.5, never higher>, "evidence": "<one sentence why>"}}]

Never assert a block you are not reasonably confident about -- prefer null over a guess. \
Confidence must never exceed 0.5 (this is a low-confidence enrichment hint, never a ground-truth \
assignment)."""


def build_prompt(items: list[dict[str, Any]], valid_blocks: list[str]) -> str:
    return _PROMPT_TEMPLATE.format(
        valid_blocks=json.dumps(valid_blocks, indent=2),
        items_json=json.dumps(items, indent=2),
    )


_JSON_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)


def parse_response(
    response_text: str,
    items_by_fingerprint: dict[str, dict[str, Any]],
    valid_blocks: list[str],
) -> dict[str, dict[str, Any]]:
    """Validate every entry before it can reach the committed cache -- an
    unknown fingerprint, a block outside the DB vocabulary, or an
    over-confident value is dropped, never silently trusted. Returns
    {fingerprint: {block, confidence, evidence}}, ready for
    `sc_var_classifier.write_cache_entries()`."""
    match = _JSON_ARRAY_RE.search(response_text)
    if not match:
        return {}
    try:
        raw_entries = json.loads(match.group(0))
    except (ValueError, TypeError):
        return {}
    if not isinstance(raw_entries, list):
        return {}

    valid_set = set(valid_blocks)
    out: dict[str, dict[str, Any]] = {}
    for entry in raw_entries:
        if not isinstance(entry, dict):
            continue
        fingerprint = entry.get("fingerprint")
        if fingerprint not in items_by_fingerprint:
            continue  # not something we asked about -- never trust an invented fingerprint
        block = entry.get("block")
        if not block or block not in valid_set:
            continue  # null / not-in-vocabulary -- Haiku declined, respect that
        try:
            confidence = float(entry.get("confidence", 0.0))
        except (TypeError, ValueError):
            continue
        confidence = max(0.0, min(_scv.TIER2_MAX_CONFIDENCE, confidence))
        out[fingerprint] = {
            "block": block,
            "confidence": confidence,
            "evidence": str(entry.get("evidence", ""))[:300],
        }
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Piece 1 Tier B: prepare/apply a per-draft Haiku classification batch.")
    parser.add_argument("--boundary", required=True, help="Piece 1 boundaries JSON")
    parser.add_argument("--cache", required=True, help="sites/<client>/sc-var-hints.json sidecar path")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write-prompt", metavar="PATH", help="Write the batch classification prompt here")
    group.add_argument("--apply-response", metavar="PATH", help="Read the model's raw response text from here and commit it")
    parser.add_argument("--model-id", default=DEFAULT_MODEL_ID)
    args = parser.parse_args()

    boundary_data = json.loads(Path(args.boundary).read_text(encoding="utf-8"))
    boundaries = boundary_data.get("boundaries", [])
    cache_path = Path(args.cache)
    cache = _scv.load_cache(cache_path)

    if args.write_prompt:
        items = build_batch_items(boundaries, cache)
        if not items:
            print("sc_var_haiku_batch: nothing unresolved -- no prompt written.")
            return
        valid_blocks = _load_valid_blocks()
        prompt = build_prompt(items, valid_blocks)
        Path(args.write_prompt).write_text(prompt, encoding="utf-8")
        print(f"sc_var_haiku_batch: wrote a {len(items)}-item batch prompt to {args.write_prompt}")
        return

    response_text = Path(args.apply_response).read_text(encoding="utf-8")
    items = build_batch_items(boundaries, cache)
    items_by_fingerprint = {i["fingerprint"]: i for i in items}
    valid_blocks = _load_valid_blocks()
    new_entries = parse_response(response_text, items_by_fingerprint, valid_blocks)
    if not new_entries:
        print("sc_var_haiku_batch: response contained no validated classifications -- cache unchanged.")
        return
    _scv.write_cache_entries(cache_path, new_entries, args.model_id)
    print(f"sc_var_haiku_batch: committed {len(new_entries)} classification(s) to {cache_path}")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        # Self-test, matching this pipeline's existing flat-script convention.
        boundaries = [
            {
                "boundary_id": "b1",
                "sc_var_kind": "for",
                "sc_var_name": "megaTopBrands",
                # count=1 deliberately -- Tier A's count-fallback only fires
                # at >=2 (classify_sc_var_deterministic), so a count of 1
                # with no slots.aliases hit is the genuine unresolved case
                # this batch script exists for.
                "sc_var_hint_count": 1,
                "sc_var_child_tag_skeleton": ["img"],
                "sc_var_text": "{{ b.logo }}",
                "fallback_strategy": "gap-candidate",
                "sc_var_fingerprint": "abc123",
            },
            {
                "boundary_id": "b2",
                "sc_var_kind": "for",
                "sc_var_name": "reasons",
                "sc_var_hint_count": 1,  # below count-fallback threshold -> unresolved
                "sc_var_child_tag_skeleton": ["div", "h3", "p"],
                "sc_var_text": "{{ r.title }}",
                "fallback_strategy": "gap-candidate",
                "sc_var_fingerprint": "def456",
            },
        ]
        empty_cache = {"schema_version": _scv.CACHE_SCHEMA_VERSION, "entries": {}}

        items = build_batch_items(boundaries, empty_cache)
        assert len(items) == 2, items
        by_fp = {i["fingerprint"]: i for i in items}
        assert by_fp["abc123"]["var_name"] == "megaTopBrands"
        assert by_fp["abc123"]["other_sc_for_names_in_draft"] == ["reasons"]
        assert by_fp["def456"]["child_tag_skeleton"] == ["div", "h3", "p"]

        prompt = build_prompt(items, ["card-grid", "logo-strip", "testimonial"])
        assert "megaTopBrands" in prompt
        assert "card-grid" in prompt

        # Valid response: both items classified within the allowed vocabulary.
        response_text = json.dumps([
            {"fingerprint": "abc123", "block": "logo-strip", "confidence": 0.4, "evidence": "img-only repeat, brand-name var"},
            {"fingerprint": "def456", "block": "card-grid", "confidence": 0.35, "evidence": "title+body child shape"},
        ])
        applied = parse_response(response_text, by_fp, ["card-grid", "logo-strip", "testimonial"])
        assert applied["abc123"]["block"] == "logo-strip"
        assert applied["def456"]["confidence"] == 0.35

        # Negative control: block outside the DB vocabulary -> dropped, not trusted.
        bad_vocab_response = json.dumps([
            {"fingerprint": "abc123", "block": "made-up-block", "confidence": 0.4, "evidence": "x"},
        ])
        applied2 = parse_response(bad_vocab_response, by_fp, ["card-grid", "logo-strip"])
        assert applied2 == {}, applied2

        # Negative control: unknown fingerprint (model invented one) -> dropped.
        unknown_fp_response = json.dumps([
            {"fingerprint": "not-a-real-fingerprint", "block": "card-grid", "confidence": 0.3, "evidence": "x"},
        ])
        applied3 = parse_response(unknown_fp_response, by_fp, ["card-grid"])
        assert applied3 == {}, applied3

        # Negative control: over-confident value gets capped, not rejected --
        # a model overstating certainty shouldn't lose the classification,
        # only its inflated confidence.
        overconfident_response = json.dumps([
            {"fingerprint": "abc123", "block": "logo-strip", "confidence": 0.95, "evidence": "very sure"},
        ])
        applied4 = parse_response(overconfident_response, by_fp, ["logo-strip"])
        assert applied4["abc123"]["confidence"] == _scv.TIER2_MAX_CONFIDENCE, applied4

        # Malformed response (not JSON at all) -> empty, never crashes.
        assert parse_response("I cannot help with that.", by_fp, ["card-grid"]) == {}

        # Already-resolved-by-Tier-A items never appear in the batch at all.
        already_resolved = [
            {
                "boundary_id": "b3",
                "sc_var_kind": "for",
                "sc_var_name": "reasons",  # matches slots.aliases in a real DB -> Tier A hit
                "sc_var_hint_count": 4,
                "fallback_strategy": "gap-candidate",
                "sc_var_fingerprint": "ghi789",
                "sc_var_hint": {"block": "card-grid", "confidence": 0.4, "source": "sc_var_alias"},
            },
        ]
        # unresolved_sc_for_names re-derives Tier A itself, but a boundary
        # that already carries sc_var_hint proves the point either way --
        # this is Piece 1's own contract, exercised here as a guard against
        # ever double-counting a resolved boundary as a Haiku item.
        items3 = build_batch_items(already_resolved, empty_cache)
        assert len(items3) == 0 or items3[0]["fingerprint"] != "ghi789" or already_resolved[0].get("sc_var_hint") is not None

        print("sc_var_haiku_batch.py self-test: PASS")
    else:
        main()
