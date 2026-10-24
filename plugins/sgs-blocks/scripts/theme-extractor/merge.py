"""merge.py — lay a generated snapshot over the client's existing one (FR-33-11, non-destructive).

``merge_onto`` keeps every palette slug, styles key, custom key and button-preset key the run did not derive, so a
re-extraction never strips what the client's snapshot holds and the draft cannot restate.
"""
from __future__ import annotations

import copy


# settings.custom keys build_snapshot derives from the draft (button presets, declared radius, accent
# sets); every other custom key belongs to the client snapshot and survives a merge.
EXTRACTOR_OWNED_CUSTOM = frozenset({"buttonPresets", "borderRadius", "accentSets"})
# The top-level styles keys build_snapshot writes (styles.css and styles.blocks merge on their own).
EXTRACTOR_OWNED_STYLES = frozenset({"typography", "color", "elements"})


def _merge_button_presets(gen_custom: dict, existing: dict | None, trace: list) -> None:
    """Per key, the client's button preset wins for every key this run did not measure.

    The keys a run measured are the ``kind: preset`` trace rows' ``keys`` (presets.build_button_presets);
    those take the draft's value (with no such row, every generated key does). Every other key of an existing slot (press shadow and transform, hover
    easings and timing, hover colours the hover reading left unchanged) is carried, so a re-run never drops
    what the extractor cannot read, and the framework baseline never overwrites the client's value."""
    if not isinstance(existing, dict) or not existing:
        return
    measured = {}
    for row in trace:
        if row.get("kind") == "preset" and str(row.get("slot", "")).startswith("buttonPresets."):
            measured[row["slot"].split(".", 1)[1]] = set(filter(None, str(row.get("keys", "")).split(",")))
    gen = gen_custom.setdefault("buttonPresets", {})
    for slot, ex_slot in existing.items():
        if not isinstance(ex_slot, dict):
            continue
        gen_slot = gen.get(slot) if isinstance(gen.get(slot), dict) else {}
        own = measured.get(slot, set()) if measured else set(gen_slot)
        merged = copy.deepcopy(ex_slot)
        for key, value in gen_slot.items():
            if key in own or key not in merged:
                merged[key] = value
        gen[slot] = merged
        trace.append({"kind": "merge", "what": f"buttonPresets.{slot}",
                      "reason": "measured keys take the draft's value; every other key keeps the client's",
                      "measured": ",".join(sorted(own)) or "(none)",
                      "carried": ",".join(sorted(k for k in ex_slot if k not in own)) or "(none)"})


def merge_onto(snap: dict, existing: dict, trace: list, baseline: dict | None = None) -> dict:
    """ADDITIVELY merge the generated ``snap`` onto an EXISTING client snapshot (FR-33-11 non-destruct).

    The generated globals/base/palette WIN (they carry the drift fix); but every EXISTING slug the
    generated palette does NOT cover is PRESERVED (warm-axis / aliases / colours the draft can't
    provide), as is the client's hand-authored component CSS + pattern refs. This is what makes a
    deploy to an already-cloned site non-breaking (the D318 pink regression = a destructive replace).

    A key the extractor owns (``EXTRACTOR_OWNED_CUSTOM``) wins only when this run derived it: a generated value
    that is the framework ``baseline``'s own copy (or absent) means the draft gave nothing for it, so the client's
    value stands. A top-level ``styles`` key the extractor never writes (``EXTRACTOR_OWNED_STYLES`` lists the ones
    it does) keeps the client's value over the framework copy.
    """
    gen_slugs = {e.get("slug") for e in snap.get("settings", {}).get("color", {}).get("palette", [])}
    ex_pal = existing.get("settings", {}).get("color", {}).get("palette", []) or []
    added = 0
    for e in ex_pal:
        if e.get("slug") and e.get("slug") not in gen_slugs:
            snap.setdefault("settings", {}).setdefault("color", {}).setdefault("palette", []).append(e)
            added += 1
    ex_styles, ex_custom = existing.get("styles", {}), existing.get("settings", {}).get("custom", {})
    base_styles = (baseline or {}).get("styles") or {}
    kept_styles = []
    for key, value in ex_styles.items():
        gen_styles = snap.setdefault("styles", {})
        if key in EXTRACTOR_OWNED_STYLES or key in ("css", "blocks"):
            continue
        if key not in gen_styles or (baseline is not None and gen_styles.get(key) == base_styles.get(key)):
            if gen_styles.get(key) != value:
                gen_styles[key] = copy.deepcopy(value)
                kept_styles.append(key)
    trace.append({"kind": "merge", "what": "styles",
                  "reason": "client styles keys the extractor does not write keep the client's value",
                  "keys_carried": ",".join(sorted(kept_styles)) or "(none)"})
    for key in ("css", "blocks"):
        if ex_styles.get(key) and not snap.get("styles", {}).get(key):
            snap.setdefault("styles", {})[key] = ex_styles[key]
    # settings.custom: the client's value wins for every key the extractor does not derive (focus
    # rings calibrated to the client palette, motion, section and gutter tokens, pattern pointers);
    # the generated value wins for the keys the extractor measures.
    gen_custom = snap.setdefault("settings", {}).setdefault("custom", {})
    carried = []
    base_custom = ((baseline or {}).get("settings") or {}).get("custom") or {}
    for key, value in ex_custom.items():
        derived = key in gen_custom and (baseline is None or gen_custom.get(key) != base_custom.get(key))
        if (key in EXTRACTOR_OWNED_CUSTOM and (key == "buttonPresets" or derived)) or gen_custom.get(key) == value:
            continue
        gen_custom[key] = copy.deepcopy(value)
        carried.append(key)
    trace.append({"kind": "merge", "what": "settings.custom",
                  "reason": "client keys the extractor does not derive are carried from the existing snapshot",
                  "keys_carried": ",".join(sorted(carried)) or "(none)"})
    _merge_button_presets(gen_custom, ex_custom.get("buttonPresets"), trace)

    # styles.elements — preserve the client's hand-authored element keys the extractor never derives
    # (e.g. `button.typography.textDecoration`, which exists only in the client snapshot and was
    # dropped on every re-run). Fill-only: an existing leaf is carried across ONLY where the generated
    # snapshot has no value, so a generated (measured) value always wins.
    #
    # No h-tag exception is needed here: build_snapshot no longer deletes a heading level it cannot
    # measure (it leaves the framework baseline standing), so there is no "popped" state for a prior
    # snapshot to resurrect. Fill-only is safe for every element uniformly.
    ex_elements = ex_styles.get("elements", {}) or {}
    gen_elements = snap.setdefault("styles", {}).setdefault("elements", {})

    def _fill_only(dst: dict, src: dict) -> int:
        """Recursively add keys from ``src`` that ``dst`` lacks. Never overwrites. Returns count."""
        n = 0
        for k, v in src.items():
            if isinstance(v, dict):
                if not isinstance(dst.get(k), dict):
                    if k in dst:
                        continue        # a non-dict generated value stands
                    dst[k] = {}
                n += _fill_only(dst[k], v)
            elif k not in dst:
                dst[k] = v
                n += 1
        return n

    el_filled = 0
    for name, val in ex_elements.items():
        if isinstance(val, dict):
            el_filled += _fill_only(gen_elements.setdefault(name, {}), val)
    trace.append({"kind": "merge", "what": "styles.elements",
                  "reason": "fill-only carry of client element keys the extractor does not derive "
                            "(generated/measured values always win)",
                  "keys_preserved": el_filled})

    trace.append({"kind": "merge", "reason": f"additive merge onto existing snapshot: {added} extra "
                  f"palette slug(s) preserved + component css/blocks/patterns carried forward"})
    return snap
