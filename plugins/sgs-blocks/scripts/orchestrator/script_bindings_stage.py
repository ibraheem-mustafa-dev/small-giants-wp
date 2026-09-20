"""script_bindings_stage: turn a draft script's own width rules into the per-run value map the converter reads.

Plan step A1 (D1132). ``build_run_map`` is called once per run, right after the draft has been prepared
(dc-import spliced, JS content resolved) and before any section is converted. It runs
``script_bindings.resolve_tier_bindings`` on the run copy with the converter's OWN tier samples and ranges
(so both sides agree on what "tablet" means), writes ``run_dir/script-bindings.json`` for the record and
returns ``{binding name: {mobile, tablet, desktop, intra_tier}}`` for ``converter.entry.convert_section``.

Behaviour that matters:

* A draft with no ``{{ }}`` in any style value (every static or BEM draft, Mama's Munches included) yields
  an EMPTY map and writes NO file: the run is byte-identical to a run without this stage.
* Fail-soft. Any failure returns an empty map and says why; the converter then drops and gaps every binding
  exactly as it did before. One retry when the evaluator hit a time budget (measured: a heavily loaded
  machine can exhaust it; the evaluator fails closed, never to a wrong value).
* Nothing is guessed: a name the script cannot resolve from the width alone stays unresolved with its
  reason in the JSON, and its declaration is dropped and gapped by the converter as today.
"""
from __future__ import annotations

import collections
import json
import pathlib
import sys
from typing import Any, Callable

_HERE = pathlib.Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

_RETRY_MARKERS = ("deadline", "timed out")


def _converter_tiers() -> tuple[dict[str, int] | None, dict[str, tuple[int, int]] | None]:
    """The converter's own tier sample widths and ranges, lower-cased; ``(None, None)`` if unavailable."""
    try:
        scripts = str(_HERE.parent)
        if scripts not in sys.path:
            sys.path.insert(0, scripts)
        from converter.db import db_lookup
        widths = {t.lower(): int(w) for t, w in db_lookup.device_tier_samples()}
        ranges = {t.lower(): (int(lo), int(hi)) for t, lo, hi in db_lookup.device_tier_ranges()}
        return widths, ranges
    except Exception:  # noqa: BLE001 -- the evaluator's own defaults are correct for the fixed 768/1024 tiers
        return None, None


def _reason_class(reason: str) -> str:
    r = reason.lower()
    if "loop item" in r or "dotted" in r:
        return "loop-item field (a data row, not a width)"
    if "reads state" in r or "state s." in r:
        return "state driven"
    if "no definition" in r:
        return "no definition in the render function"
    return "other: " + reason[:60]


def build_run_map(draft_html: str, run_dir: pathlib.Path, log: Callable[[str], None] = print) -> dict[str, dict[str, Any]]:
    """The per-run binding map (empty when there is nothing to resolve or the evaluator is unavailable)."""
    from script_bindings import resolve_tier_bindings

    widths, ranges = _converter_tiers()
    result = resolve_tier_bindings(draft_html, tier_widths=widths, tier_ranges=ranges)
    if result["problems"] and any(m in p.lower() for p in result["problems"] for m in _RETRY_MARKERS):
        log("[script-bindings] evaluator hit its time budget; retrying once")
        result = resolve_tier_bindings(draft_html, tier_widths=widths, tier_ranges=ranges)

    if not result["resolved"] and not result["unresolved"] and not result["problems"]:
        return {}                                   # nothing bound in any style value: inert, no file

    run_map: dict[str, dict[str, Any]] = {
        name: {"mobile": e["mobile"], "tablet": e["tablet"], "desktop": e["desktop"], "intra_tier": e["intra_tier"]}
        for name, e in result["resolved"].items()
    }
    record = {
        "flags": result["flags"], "tier_widths": result["tier_widths"], "snaps": result["snaps"],
        "resolved": run_map, "unresolved": result["unresolved"], "problems": result["problems"],
    }
    try:
        (run_dir / "script-bindings.json").write_text(json.dumps(record, indent=1, ensure_ascii=False), encoding="utf-8")
    except OSError as exc:
        log("[script-bindings] could not write script-bindings.json: %s" % exc)

    why = collections.Counter(_reason_class(u["reason"]) for u in result["unresolved"])
    log("[script-bindings] resolved %d name(s) for the three device tiers; unresolved %d %s; thresholds snapped %d; in-tier gaps %d"
        % (len(run_map), len(result["unresolved"]), dict(why), len(result["snaps"]),
           sum(1 for e in result["resolved"].values() if e["intra_tier"])))
    for p in result["problems"]:
        log("[script-bindings] PROBLEM: %s (every style binding will be dropped and gapped as before)" % p)
    return run_map
