#!/usr/bin/env python3
"""sc_var_classifier.py -- Claude Design `sc-for` variable-name classifier.

Universal-pipeline upgrade, Piece 1 (2026-09-14). Design grounded in a
research-buddies pass -- see
`C:/Users/Bean/.claude/memory/research/2026-09-14-claude-design-sc-for-variable-naming.md`
for the full evidence trail. Short version:

  - Claude Design (`.dc.html` drafts, e.g. `sites/eye-care-ward-end/`) carries
    ZERO CSS classes. The only identity signal for repeated content is the
    free-text variable name bound by the nearest `<sc-for list="{{ name }}">`
    ancestor wrapper -- `<sc-for>`/`<sc-if>` are TAG NAMES, not attributes on
    the target element, so this signal lives on an ANCESTOR, unlike
    `data-slot` (shadcn/Radix, Tier 1), which is a same-element attribute.
  - Verified via real cross-draft GitHub search: `reasons`/`featured`/
    `ticker`/`marquee` recur for the same semantic section type across dozens
    of independent Claude Design drafts -- a genuine (if undocumented)
    emergent convention, NOT draft-author noise. Compound/prefixed names
    (`megaTopBrands`, `shapeTiles`) do NOT recur -- treated as bespoke.
  - `slot_synonyms` is dead (retired D99); its successor `slots.aliases` is
    AUTHORITATIVE (real BEM-class identity, consumed by
    `converter/db/db_lookup.py::equivalent_block_for`). Seeding Claude
    Design's free-text names into it would make generic English words start
    resolving real client BEM classes -- so this module only ever READS
    `slots.aliases`, never writes to it, and every hint it produces is capped
    at `TIER2_MAX_CONFIDENCE` (mirrored from `dom_shape_classifier.py`) and
    routed as pure enrichment via `leftover-bucket-router.py`, never a block
    assignment.
  - `sc-if value="{{ name }}"` names a boolean STATE flag (`menuOpen`,
    `hasImg`), not a collection -- explicitly OUT OF SCOPE for block-identity
    classification. Only `sc-for` is handled here.

TWO TIERS:
  1. Deterministic (this file, free, always runs): exact/singular match
     against `slots.aliases` (read-only DB query) + `hint-placeholder-count`
     (repeat cardinality without needing rendered siblings) -> a card-grid-
     shaped hint when count >= 2.
  2. Model-assisted (NOT called from here): a Haiku classifier batched ONCE
     PER DRAFT (never per boundary), invoked by the pipeline session/
     orchestrator -- not this module, which has no network access and no API
     client. This module only provides `unresolved_sc_for_names()` (what
     still needs classifying) and `load_cache()`/`hint_from_cache()` (to
     consume a previously-committed classification). The committed cache
     sidecar is `sites/<client>/sc-var-hints.json`, keyed by a content hash
     of (variable name + context fingerprint) so pipeline reruns are
     byte-reproducible with ZERO network calls -- the model is a build-time
     authoring aid, never a runtime dependency.

HARD CONSTRAINTS (mirrors `dom_shape_classifier.py` exactly):
  1. NEVER fires on an element carrying ANY already-canonical SGS-BEM class
     (`_any_class_already_canonical`, reused directly from dom_shape_classifier).
  2. NEVER asserts identity as ground truth -- confidence capped at
     `TIER2_MAX_CONFIDENCE`, routed through the gap-candidate/operator-review
     flow only.
  3. No 4th walker conditional -- runs entirely outside `converter/walk.py`,
     at boundary-build time and leftover-routing time, same as Tier 2.

UK English in comments + output.
"""
from __future__ import annotations

import hashlib
import importlib.util as _ilu
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

# dom_shape_classifier.py's `Hint` + `_any_class_already_canonical` + the
# shared confidence cap are reused directly, not re-derived -- same
# not-a-package flat-CLI-script loading convention used throughout this
# pipeline (see dom_shape_classifier.py's own lingua_franca load).
_DSC_PATH = _HERE / "dom_shape_classifier.py"
_dsc_spec = _ilu.spec_from_file_location("dom_shape_classifier", _DSC_PATH)
_dsc = _ilu.module_from_spec(_dsc_spec)
sys.modules.setdefault("dom_shape_classifier", _dsc)
_dsc_spec.loader.exec_module(_dsc)

Hint = _dsc.Hint
TIER2_MAX_CONFIDENCE = _dsc.TIER2_MAX_CONFIDENCE
_any_class_already_canonical = _dsc._any_class_already_canonical

# Read-only DB access -- the project convention (CLAUDE.md "DB-first, no
# hardcoded dicts"): `sqlite3.connect(f'file:{db}?mode=ro', uri=True)`, the
# same path used by `audit-declared-vs-seeded-roles.py` /
# `check-converter-destination-shape.py`. This module NEVER writes to the DB.
DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

CACHE_SCHEMA_VERSION = 1


def _singularise(word: str) -> str:
    """Crude English singularisation -- good enough for alias matching, not
    a general NLP tool. `reasons` -> `reason`, `features` -> `feature`."""
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("es") and len(word) > 3:
        return word[:-2]
    if word.endswith("s") and len(word) > 2 and not word.endswith("ss"):
        return word[:-1]
    return word


def _load_slot_aliases() -> dict[str, str]:
    """Read `slots.aliases` (element scope) into a flat alias->standalone_block
    map. Read-only, soft-fails to `{}` -- an optional enrichment must never
    break Stage 1 boundary building."""
    try:
        conn = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
        try:
            rows = conn.execute(
                "SELECT aliases, standalone_block FROM slots "
                "WHERE scope='element' AND standalone_block IS NOT NULL"
            ).fetchall()
        finally:
            conn.close()
    except Exception:
        return {}
    flat: dict[str, str] = {}
    for aliases_json, standalone_block in rows:
        if not standalone_block:
            continue
        try:
            aliases = json.loads(aliases_json) if aliases_json else []
        except (TypeError, ValueError):
            continue
        for alias in aliases:
            flat[str(alias).lower()] = standalone_block
    return flat


def classify_sc_var_deterministic(
    var_name: str,
    hint_placeholder_count: int | None,
    class_signature: list[str] | None,
) -> Hint | None:
    """Tier A -- free, deterministic, no model call.

    Priority: an exact/singular `slots.aliases` hit is stronger evidence than
    repeat cardinality alone, so it is tried first.
    """
    if _any_class_already_canonical(class_signature):
        return None
    if not var_name:
        return None
    lowered = var_name.strip().lower()
    aliases = _load_slot_aliases()
    for candidate in (lowered, _singularise(lowered)):
        block = aliases.get(candidate)
        if block:
            return Hint(
                block=block,
                confidence=min(TIER2_MAX_CONFIDENCE, 0.4),
                evidence=f'sc-for variable "{var_name}" matched slots.aliases -> {candidate}',
                source="sc_var_alias",
            )
    if hint_placeholder_count is not None and hint_placeholder_count >= 2:
        return Hint(
            block="sgs/card-grid",
            confidence=min(TIER2_MAX_CONFIDENCE, 0.25 + 0.03 * hint_placeholder_count),
            evidence=(
                f'sc-for variable "{var_name}" declares '
                f"hint-placeholder-count={hint_placeholder_count} (repeat cardinality)"
            ),
            source="sc_var_count",
        )
    return None


def content_fingerprint(
    var_name: str,
    wrapped_tag: str,
    child_tag_skeleton: list[str],
    text_snippet: str,
    sibling_var_names: list[str],
) -> str:
    """Stable hash keying the committed cache sidecar -- a NEW hash only
    when the draft's actual markup around this variable changes, so a
    re-run of the same draft never re-triggers a model call."""
    payload = json.dumps(
        {
            "var_name": var_name,
            "wrapped_tag": wrapped_tag,
            "child_tag_skeleton": child_tag_skeleton,
            "text_snippet": text_snippet[:80],
            "sibling_var_names": sorted(sibling_var_names),
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def load_cache(cache_path: Path) -> dict:
    """Read the committed `sc-var-hints.json` sidecar. Soft-fails to an
    empty cache with the current schema version if the file is missing or
    corrupt -- a stale/missing cache must never break the pipeline, only
    reduce it to Tier A."""
    try:
        data = json.loads(cache_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"schema_version": CACHE_SCHEMA_VERSION, "entries": {}}
    if data.get("schema_version") != CACHE_SCHEMA_VERSION:
        # A future re-derivation bumps the schema version deliberately --
        # never silently trust a hint shaped by an older schema.
        return {"schema_version": CACHE_SCHEMA_VERSION, "entries": {}}
    return data


def hint_from_cache(
    cache: dict,
    fingerprint: str,
    class_signature: list[str] | None,
) -> Hint | None:
    """Tier B -- a previously-committed Haiku classification, keyed by
    content fingerprint. Returns None on any miss (never classified yet, or
    the model declined to classify it) -- callers fall back to Tier A only."""
    if _any_class_already_canonical(class_signature):
        return None
    entry = cache.get("entries", {}).get(fingerprint)
    if not entry or not entry.get("block"):
        return None
    return Hint(
        block=entry["block"],
        confidence=min(TIER2_MAX_CONFIDENCE, float(entry.get("confidence", 0.5))),
        evidence=entry.get("evidence", f"cached model classification ({fingerprint})"),
        source="sc_var_model",
    )


def unresolved_sc_for_names(
    boundaries: list[dict],
    cache: dict,
) -> list[dict]:
    """What still needs a Haiku call -- every gap-candidate boundary
    carrying an `sc_var_name` (kind='for') whose fingerprint has no Tier A
    hit and no cache entry yet. Returned shape is exactly what a batch
    classification prompt needs; this function does NOT call any model."""
    out: list[dict] = []
    for b in boundaries:
        if b.get("sc_var_kind") != "for":
            continue
        if b.get("fallback_strategy") != "gap-candidate":
            continue
        fingerprint = b.get("sc_var_fingerprint")
        if not fingerprint:
            continue
        if fingerprint in cache.get("entries", {}):
            continue
        if classify_sc_var_deterministic(
            b.get("sc_var_name", ""),
            b.get("sc_var_hint_count"),
            b.get("class_signature"),
        ):
            continue
        out.append(
            {
                "boundary_id": b.get("boundary_id"),
                "var_name": b.get("sc_var_name"),
                "hint_placeholder_count": b.get("sc_var_hint_count"),
                "fingerprint": fingerprint,
            }
        )
    return out


def write_cache_entries(
    cache_path: Path,
    new_entries: dict[str, dict],
    model_id: str,
) -> None:
    """Merge freshly-classified entries into the committed sidecar. Each
    entry records the model id per research-buddies' finding: a wrong
    cached hint must not silently survive a future re-derivation."""
    cache = load_cache(cache_path)
    for fingerprint, result in new_entries.items():
        cache["entries"][fingerprint] = {
            "block": result.get("block"),
            "confidence": result.get("confidence", 0.5),
            "evidence": result.get("evidence", ""),
            "model_id": model_id,
        }
    cache_path.write_text(json.dumps(cache, indent=2, sort_keys=True), encoding="utf-8")


_SC_VAR_ATTR_BY_TAG = {"sc-for": "list", "sc-if": "value"}
_SC_VAR_INTERP = re.compile(r"^\s*\{\{\s*([A-Za-z_][A-Za-z0-9_.]*)\s*\}\}\s*$")


def nearest_sc_wrapper(node: Any) -> dict | None:
    """Walk UP from `node` (a BeautifulSoup Tag) to the nearest `<sc-for>`/
    `<sc-if>` ancestor and extract its binding variable name.

    Unlike `data-slot` (Tier 1, an ATTRIBUTE on the target element itself),
    this signal lives on an ANCESTOR wrapper tag -- `sc-for`/`sc-if` are tag
    names, not attributes. Returns None when there is no such ancestor
    (the overwhelming majority of elements in a non-Claude-Design draft).
    """
    try:
        wrapper = node.find_parent(list(_SC_VAR_ATTR_BY_TAG.keys()))
    except AttributeError:
        return None
    if wrapper is None:
        return None
    kind = "for" if wrapper.name == "sc-for" else "if"
    attr_name = _SC_VAR_ATTR_BY_TAG[wrapper.name]
    raw = wrapper.get(attr_name) or ""
    m = _SC_VAR_INTERP.match(raw)
    if not m:
        return None
    var_name = m.group(1).split(".")[-1]  # `s.hasImg` -> `hasImg`
    result = {"kind": kind, "var_name": var_name}
    if kind == "for":
        count_raw = wrapper.get("hint-placeholder-count")
        if count_raw is not None:
            try:
                result["hint_count"] = int(count_raw)
            except ValueError:
                pass
    return result


if __name__ == "__main__":
    # Self-test, matching this pipeline's existing flat-script convention
    # (assert + PASS print, no pytest).
    assert _singularise("reasons") == "reason"
    assert _singularise("featured") == "featured"  # no plural to strip
    assert _singularise("marquee") == "marquee"
    print("sc_var_classifier.py self-test: PASS (see test_sc_var_classifier.py for full coverage)")
